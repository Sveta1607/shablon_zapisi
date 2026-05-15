// Создание записи с публичной витрины (без авторизации)
import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isPublicBookingAllowed } from "@/lib/org-access";
import { getOrganizationAccessRecord } from "@/lib/org-access-db";
import {
  computeAvailableSlots,
  createPublicBookingWithLocks,
  normalizeIdempotencyKey,
  reservationBlockMinutes,
} from "@/lib/slots";

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
  // Заголовок идемпотентности делает безопасными сетевые ретраи и двойные submit
  const idempotencyKey = normalizeIdempotencyKey(req.headers.get("Idempotency-Key"));
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (org.suspended) return NextResponse.json({ error: "Недоступно" }, { status: 404 });
  const access = await getOrganizationAccessRecord(org);
  if (!isPublicBookingAllowed(access)) {
    return NextResponse.json({ error: "Онлайн-запись временно недоступна" }, { status: 403 });
  }
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
    // Единый контракт конфликта, чтобы фронт одинаково обрабатывал устаревший слот
    return NextResponse.json(
      { error: "SLOT_CONFLICT", message: "Выбранное время больше недоступно" },
      { status: 409 }
    );
  }

  const blockMin = reservationBlockMinutes(service.durationMinutes);
  const endsAt = addMinutes(startsAt, blockMin);

  // Транзакционный create + lock-строки в БД: так закрываются гонки конкурентных запросов
  const result = await createPublicBookingWithLocks(prisma, {
    organizationId: org.id,
    serviceId: service.id,
    clientName: parsed.data.clientName,
    clientPhone: parsed.data.clientPhone,
    clientEmail: parsed.data.clientEmail ?? null,
    notes: parsed.data.notes ?? null,
    startsAt,
    endsAt,
    slotStepMinutes: org.slotStepMinutes,
    reservationMinutes: blockMin,
    idempotencyKey,
  });

  if (result.kind === "conflict") {
    return NextResponse.json(
      { error: "SLOT_CONFLICT", message: "Место только что заняли, выберите другое время" },
      { status: 409 }
    );
  }
  if (result.kind === "replayed") {
    return NextResponse.json({ ...result.booking, replayed: true }, { status: 200 });
  }

  return NextResponse.json(result.booking, { status: 201 });
}
