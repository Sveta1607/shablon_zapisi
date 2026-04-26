// Создание записи с публичной витрины (без авторизации)
import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots, reservationBlockMinutes } from "@/lib/slots";

// Телефон: ровно 12 символов — +7 и 10 цифр; email не обязателен
const bodySchema = z.object({
  serviceId: z.string().min(1),
  startsAtIso: z.string().datetime(),
  clientName: z.string().min(1).max(120),
  clientPhone: z
    .string()
    .trim()
    .regex(/^\+7[0-9]{10}$/, "Телефон: +7 и 10 цифр (12 символов)"),
  clientEmail: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v == null || v === "" ? "" : String(v).trim()))
    .pipe(
      z
        .string()
        .max(120)
        .refine((s) => s === "" || z.string().email().safeParse(s).success, "Некорректный email")
    )
    .transform((s) => (s === "" ? undefined : s)),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (org.suspended) return NextResponse.json({ error: "Недоступно" }, { status: 404 });
  if (!org.publicBookingEnabled) return NextResponse.json({ error: "Онлайн-запись отключена" }, { status: 403 });

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, organizationId: org.id, active: true },
  });
  if (!service) return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });

  const startsAt = new Date(parsed.data.startsAtIso);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Неверное время" }, { status: 400 });
  }

  // Календарный день в часовом поясе организации (блокировки и слоты завязаны на эту дату)
  const dateStrOrg = formatInTimeZone(startsAt, org.timezone, "yyyy-MM-dd");

  const blocked = await prisma.blockedDate.findUnique({
    where: {
      organizationId_dateStr: { organizationId: org.id, dateStr: dateStrOrg },
    },
  });
  if (blocked) return NextResponse.json({ error: "Этот день недоступен для записи" }, { status: 400 });

  const tz = org.timezone;
  const dayWallStart = toDate(`${dateStrOrg} 00:00:00`, { timeZone: tz });
  const dayWallEnd = toDate(`${dateStrOrg} 23:59:59`, { timeZone: tz });
  const loadSpan = Math.max(service.durationMinutes, reservationBlockMinutes(service.durationMinutes));
  const fetchFrom = addMinutes(dayWallStart, -loadSpan);
  const fetchTo = addMinutes(dayWallEnd, loadSpan);

  const [weekly, adHocRows, bookings] = await Promise.all([
    prisma.weeklySlot.findMany({ where: { organizationId: org.id } }),
    prisma.adHocDaySlot.findMany({
      where: { organizationId: org.id, dateStr: dateStrOrg },
      orderBy: { startMinutes: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        organizationId: org.id,
        startsAt: { lt: fetchTo },
        endsAt: { gt: fetchFrom },
        status: { not: "CANCELLED" },
      },
      include: { service: { select: { durationMinutes: true } } },
    }),
  ]);

  const adHocWindowsForDate = adHocRows.map((r) => ({ startMinutes: r.startMinutes, endMinutes: r.endMinutes }));

  const allowed = computeAvailableSlots({
    org,
    dateStr: dateStrOrg,
    serviceDurationMinutes: service.durationMinutes,
    weekly,
    adHocWindowsForDate: adHocWindowsForDate.length > 0 ? adHocWindowsForDate : null,
    bookings,
  });

  const match = allowed.some((d) => Math.abs(d.getTime() - startsAt.getTime()) < 60 * 1000);
  if (!match) {
    return NextResponse.json({ error: "Выбранное время больше недоступно" }, { status: 409 });
  }

  const blockMin = reservationBlockMinutes(service.durationMinutes);
  const endsAt = addMinutes(startsAt, blockMin);

  function intervalsOverlap(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
    return s1 < e2 && e1 > s2;
  }

  const others = await prisma.booking.findMany({
    where: {
      organizationId: org.id,
      status: { not: "CANCELLED" },
      startsAt: { lt: endsAt },
    },
    include: { service: { select: { durationMinutes: true } } },
  });
  const taken = others.some((b) =>
    intervalsOverlap(
      startsAt,
      endsAt,
      b.startsAt,
      addMinutes(b.startsAt, reservationBlockMinutes(b.service.durationMinutes))
    )
  );
  if (taken) {
    return NextResponse.json({ error: "Место только что заняли, выберите другое время" }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      organizationId: org.id,
      serviceId: service.id,
      clientName: parsed.data.clientName,
      clientPhone: parsed.data.clientPhone,
      clientEmail: parsed.data.clientEmail ?? null,
      notes: parsed.data.notes ?? null,
      startsAt,
      endsAt,
    },
    include: { service: true },
  });

  return NextResponse.json(booking, { status: 201 });
}
