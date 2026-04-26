// Вспомогательные функции для недельного расписания: вычитание перерыва из окон (разбиение 9–18 → 9–12 и 13–18)
import type { WeeklySlot } from "@prisma/client";

export type SlotInput = { dayOfWeek: number; startMinutes: number; endMinutes: number };

/** Стандартное «полное» окно 9:00–18:00 (минуты от полуночи), как в шаблоне при регистрации */
const DEFAULT_START_MIN = 9 * 60;
const DEFAULT_END_MIN = 18 * 60;

/** Проверка: в один и тот же день недели нет пересечений (стык 12:00 / 12:00 не считаем пересечением) */
export function findOverlapError(slots: SlotInput[]): string | null {
  for (const day of [0, 1, 2, 3, 4, 5, 6]) {
    const list = slots
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => a.startMinutes - b.startMinutes);
    for (let i = 1; i < list.length; i++) {
      if (list[i].startMinutes < list[i - 1].endMinutes) {
        return "В один день окна не должны пересекаться. Сначала уберите или сузьте существующее.";
      }
    }
  }
  return null;
}

/** Календарные исключения: в одну дату (dateStr) окна не пересекаются */
export type AdHocSlotInput = { dateStr: string; startMinutes: number; endMinutes: number };

export function findOverlapErrorAdHoc(slots: AdHocSlotInput[]): string | null {
  const byDate = new Map<string, AdHocSlotInput[]>();
  for (const s of slots) {
    const list = byDate.get(s.dateStr) ?? [];
    list.push(s);
    byDate.set(s.dateStr, list);
  }
  for (const list of byDate.values()) {
    const sorted = [...list].sort((a, b) => a.startMinutes - b.startMinutes);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startMinutes < sorted[i - 1].endMinutes) {
        return "В одну календарную дату окна не должны пересекаться. Сначала уберите или сузьте существующее.";
      }
    }
  }
  return null;
}

/**
 * Перед добавлении нового окна: убрать «дефолт» 9:00–18:00 в этот день (чтобы не было двойного покрытия),
 * затем объединить с новым окном. Дальше — проверка пересечений.
 */
export function addSlotRemovingDefaultTemplate(
  current: SlotInput[],
  newSlot: SlotInput
): { slots: SlotInput[]; error: string | null } {
  const withoutDefault = current.filter(
    (s) =>
      !(
        s.dayOfWeek === newSlot.dayOfWeek &&
        s.startMinutes === DEFAULT_START_MIN &&
        s.endMinutes === DEFAULT_END_MIN
      )
  );
  const next = [...withoutDefault, newSlot];
  const err = findOverlapError(next);
  return { slots: next, error: err };
}

/**
 * Один день: из всех окон этого дня вычитаем интервал [breakStart, breakEnd) по минутам от полуночи.
 * Не затрагивает окна в другие дни. Пересечения с перерывом превращаются в одно или два новых окна.
 */
export function applyBreakToDaySlots(
  slots: SlotInput[],
  dayOfWeek: number,
  breakStart: number,
  breakEnd: number
): SlotInput[] {
  const out: SlotInput[] = [];
  for (const s of slots) {
    if (s.dayOfWeek !== dayOfWeek) {
      out.push(s);
      continue;
    }
    if (s.endMinutes <= s.startMinutes) continue;
    if (s.endMinutes <= breakStart || s.startMinutes >= breakEnd) {
      out.push(s);
      continue;
    }
    if (s.startMinutes < breakStart) {
      out.push({ ...s, endMinutes: breakStart });
    }
    if (s.endMinutes > breakEnd) {
      out.push({ ...s, startMinutes: breakEnd });
    }
  }
  return out;
}

/** День недели по календарю (Пн–Вс) → индексы как в Date.getDay() (0=Вс, 1=Пн, …) */
export const CALENDAR_DAYS_MON_FIRST: { label: string; dayOfWeek: number }[] = [
  { label: "Понедельник", dayOfWeek: 1 },
  { label: "Вторник", dayOfWeek: 2 },
  { label: "Среда", dayOfWeek: 3 },
  { label: "Четверг", dayOfWeek: 4 },
  { label: "Пятница", dayOfWeek: 5 },
  { label: "Суббота", dayOfWeek: 6 },
  { label: "Воскресенье", dayOfWeek: 0 },
];

/** Prisma weekly → slots для API (id отбрасываем) */
export function toSlotInputs(
  list: Pick<WeeklySlot, "dayOfWeek" | "startMinutes" | "endMinutes">[]
): SlotInput[] {
  return list.map((w) => ({
    dayOfWeek: w.dayOfWeek,
    startMinutes: w.startMinutes,
    endMinutes: w.endMinutes,
  }));
}

/** Два набора окон совпадают (порядок строк не важен) */
export function slotsSetsEqual(a: SlotInput[], b: SlotInput[]): boolean {
  const key = (s: SlotInput) => `${s.dayOfWeek}:${s.startMinutes}:${s.endMinutes}`;
  const sortByKey = (arr: SlotInput[]) => [...arr].sort((x, y) => key(x).localeCompare(key(y)));
  const A = sortByKey(a);
  const B = sortByKey(b);
  if (A.length !== B.length) return false;
  return A.every((s, i) => s.dayOfWeek === B[i].dayOfWeek && s.startMinutes === B[i].startMinutes && s.endMinutes === B[i].endMinutes);
}
