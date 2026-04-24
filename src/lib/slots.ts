// Расчёт свободных слотов: недельное расписание в часовом поясе организации, вычитание записей и блокировок дат
// Длительность услуги в календаре «накрывает» ceil(мин/60) часовых ячеек подряд (61–120 мин → 2 ч, 121–180 → 3 ч и т.д.)
import { addMinutes, isBefore } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import type { Organization, WeeklySlot } from "@prisma/client";

type OrgLike = Pick<
  Organization,
  "timezone" | "minAdvanceHours" | "slotStepMinutes"
>;

/** День недели как в JS Date.getDay(): 0 — вс, 1 — пн, …, 6 — сб */
function jsDayOfWeekInZone(dateStr: string, timeZone: string): number {
  const noonLocal = toDate(`${dateStr} 12:00:00`, { timeZone });
  const isoDow = Number(formatInTimeZone(noonLocal, timeZone, "i"));
  return isoDow === 7 ? 0 : isoDow;
}

function minutesToHm(total: number): { h: number; m: number } {
  return { h: Math.floor(total / 60), m: total % 60 };
}

/** Локальное «стенное» время организации → абсолютный момент UTC */
function wallDateTimeToUtc(dateStr: string, minutesFromMidnight: number, timeZone: string): Date {
  const { h, m } = minutesToHm(minutesFromMidnight);
  const pad = (n: number) => String(n).padStart(2, "0");
  return toDate(`${dateStr} ${pad(h)}:${pad(m)}:00`, { timeZone });
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/** Минуты резерва в сетке по 60 мин: 1–60 → 60, 61–120 → 120, 121–180 → 180, 181–240 → 240 */
export function reservationBlockMinutes(serviceDurationMinutes: number): number {
  return Math.max(1, Math.ceil(Math.max(0, serviceDurationMinutes) / 60)) * 60;
}

/** Сколько «ячеек» в 60 минут занята услуга (для подсказок в UI) */
export function hourGridSlotCount(serviceDurationMinutes: number): number {
  return Math.max(1, Math.ceil(Math.max(0, serviceDurationMinutes) / 60));
}

/** Сколько шагов расписания (например 30 мин) подряд покрывает услуга */
export function stepGridSlotCount(serviceDurationMinutes: number, stepMinutes: number): number {
  if (stepMinutes <= 0) return hourGridSlotCount(serviceDurationMinutes);
  return Math.max(1, Math.ceil(Math.max(0, serviceDurationMinutes) / stepMinutes));
}

type BookingForSlots = { startsAt: Date; status: string; service: { durationMinutes: number } };

function bookingReservedEnd(b: Pick<BookingForSlots, "startsAt" | "service">): Date {
  return addMinutes(b.startsAt, reservationBlockMinutes(b.service.durationMinutes));
}

export function computeAvailableSlots(params: {
  org: OrgLike;
  dateStr: string;
  serviceDurationMinutes: number;
  weekly: WeeklySlot[];
  bookings: BookingForSlots[];
  now?: Date;
}): Date[] {
  const { org, dateStr, serviceDurationMinutes, weekly, bookings } = params;
  const now = params.now ?? new Date();
  const minStart = addMinutes(now, org.minAdvanceHours * 60);
  const block = reservationBlockMinutes(serviceDurationMinutes);

  const dow = jsDayOfWeekInZone(dateStr, org.timezone);
  const windows = weekly.filter((w) => w.dayOfWeek === dow);
  if (windows.length === 0) return [];

  const activeBookings = bookings.filter((b) => b.status !== "CANCELLED");
  const step = org.slotStepMinutes;
  const out: Date[] = [];

  for (const w of windows) {
    for (let t = w.startMinutes; t + block <= w.endMinutes; t += step) {
      const start = wallDateTimeToUtc(dateStr, t, org.timezone);
      const end = addMinutes(start, block);
      if (!isBefore(start, minStart)) {
        const hit = activeBookings.some((b) => overlaps(start, end, b.startsAt, bookingReservedEnd(b)));
        if (!hit) out.push(start);
      }
    }
  }

  return out.sort((a, b) => a.getTime() - b.getTime());
}
