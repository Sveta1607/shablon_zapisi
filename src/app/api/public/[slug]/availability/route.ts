// Свободные слоты на день для выбранной услуги (публично)
import { addMinutes } from "date-fns";
import { NextResponse } from "next/server";
import { toDate } from "date-fns-tz";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeAvailableSlots, reservationBlockMinutes } from "@/lib/slots";

const querySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    serviceId: url.searchParams.get("serviceId"),
    date: url.searchParams.get("date"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Нужны serviceId и date (YYYY-MM-DD)" }, { status: 400 });
  }
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  if (org.suspended) return NextResponse.json({ error: "Недоступно" }, { status: 404 });
  if (!org.publicBookingEnabled) return NextResponse.json({ error: "Запись отключена" }, { status: 403 });

  const blocked = await prisma.blockedDate.findUnique({
    where: {
      organizationId_dateStr: { organizationId: org.id, dateStr: parsed.data.date },
    },
  });
  if (blocked) {
    return NextResponse.json({ slots: [], blocked: true });
  }

  const service = await prisma.service.findFirst({
    where: { id: parsed.data.serviceId, organizationId: org.id, active: true },
  });
  if (!service) return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });

  const tz = org.timezone;
  const dayWallStart = toDate(`${parsed.data.date} 00:00:00`, { timeZone: tz });
  const dayWallEnd = toDate(`${parsed.data.date} 23:59:59`, { timeZone: tz });
  const loadSpan = Math.max(service.durationMinutes, reservationBlockMinutes(service.durationMinutes));
  const fetchFrom = addMinutes(dayWallStart, -loadSpan);
  const fetchTo = addMinutes(dayWallEnd, loadSpan);

  const [weekly, adHocRows, bookings] = await Promise.all([
    prisma.weeklySlot.findMany({ where: { organizationId: org.id } }),
    prisma.adHocDaySlot.findMany({
      where: { organizationId: org.id, dateStr: parsed.data.date },
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

  const slots = computeAvailableSlots({
    org,
    dateStr: parsed.data.date,
    serviceDurationMinutes: service.durationMinutes,
    weekly,
    adHocWindowsForDate: adHocWindowsForDate.length > 0 ? adHocWindowsForDate : null,
    bookings,
  });

  return NextResponse.json({
    slots: slots.map((d) => d.toISOString()),
    timezone: org.timezone,
  });
}
