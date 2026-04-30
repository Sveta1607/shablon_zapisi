// Расчёт свободных слотов: недельное расписание в часовом поясе организации, вычитание записей и блокировок дат
// Длительность услуги в календаре «накрывает» ceil(мин/60) часовых ячеек подряд (61–120 мин → 2 ч, 121–180 → 3 ч и т.д.)
import { addMinutes, isBefore } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import { Prisma } from "@prisma/client";
import type { Booking, Organization, PrismaClient, Service, WeeklySlot } from "@prisma/client";

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
  /** Если на эту dateStr заданы окна (исключения), они полностью заменяют недельный шаблон */
  adHocWindowsForDate?: { startMinutes: number; endMinutes: number }[] | null;
  bookings: BookingForSlots[];
  now?: Date;
}): Date[] {
  const { org, dateStr, serviceDurationMinutes, weekly, bookings, adHocWindowsForDate } = params;
  const now = params.now ?? new Date();
  const minStart = addMinutes(now, org.minAdvanceHours * 60);
  const block = reservationBlockMinutes(serviceDurationMinutes);

  const dow = jsDayOfWeekInZone(dateStr, org.timezone);
  // Исключения на дату: приоритет над повторяющимся днём недели
  const windows =
    adHocWindowsForDate && adHocWindowsForDate.length > 0
      ? adHocWindowsForDate
      : weekly.filter((w) => w.dayOfWeek === dow);
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

// Нормализация заголовка идемпотентности: пустые и слишком длинные ключи отбрасываем
export function normalizeIdempotencyKey(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  return trimmed;
}

// Возвращает шаги сетки (например, по 30 минут), которые блокирует бронь
export function buildReservedStepStarts(
  startsAt: Date,
  reservationMinutes: number,
  stepMinutes: number
): Date[] {
  const safeStep = Math.max(1, stepMinutes);
  const steps = Math.max(1, Math.ceil(reservationMinutes / safeStep));
  return Array.from({ length: steps }, (_, i) => addMinutes(startsAt, i * safeStep));
}

type CreatePublicBookingInput = {
  organizationId: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string | null;
  notes?: string | null;
  startsAt: Date;
  endsAt: Date;
  slotStepMinutes: number;
  reservationMinutes: number;
  idempotencyKey?: string | null;
};

type CreatePublicBookingResult =
  | { kind: "created"; booking: Booking & { service: Service } }
  | { kind: "replayed"; booking: Booking & { service: Service } }
  | { kind: "conflict" };

// Атомарное создание брони + блокировок шагов: БД сама остановит конкурирующие запросы
export async function createPublicBookingWithLocks(
  prisma: PrismaClient,
  input: CreatePublicBookingInput
): Promise<CreatePublicBookingResult> {
  const stepStarts = buildReservedStepStarts(input.startsAt, input.reservationMinutes, input.slotStepMinutes);
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (input.idempotencyKey) {
        // Повторный запрос с тем же ключом должен вернуть уже созданную запись, не создавая дубль
        const existing = await tx.booking.findFirst({
          where: {
            organizationId: input.organizationId,
            idempotencyKey: input.idempotencyKey,
          },
          include: { service: true },
        });
        if (existing) {
          return { kind: "replayed", booking: existing } as const;
        }
      }

      const booking = await tx.booking.create({
        data: {
          organizationId: input.organizationId,
          serviceId: input.serviceId,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail ?? null,
          notes: input.notes ?? null,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          idempotencyKey: input.idempotencyKey ?? null,
          status: "CONFIRMED",
        },
        include: { service: true },
      });

      // Отдельная таблица lock-строк дает устойчивую защиту от гонок через unique constraint
      await tx.bookingSlotLock.createMany({
        data: stepStarts.map((slotStart) => ({
          organizationId: input.organizationId,
          bookingId: booking.id,
          slotStart,
        })),
      });

      return { kind: "created", booking } as const;
    });
    return result;
  } catch (error) {
    // P2002 = нарушение уникальности: слот уже занят или такой idempotency key уже использован
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      if (input.idempotencyKey) {
        const replayed = await prisma.booking.findFirst({
          where: {
            organizationId: input.organizationId,
            idempotencyKey: input.idempotencyKey,
          },
          include: { service: true },
        });
        if (replayed) return { kind: "replayed", booking: replayed };
      }
      return { kind: "conflict" };
    }
    throw error;
  }
}
