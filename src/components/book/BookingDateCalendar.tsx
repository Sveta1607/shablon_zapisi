"use client";

// Календарь выбора даты: неделя с понедельника, подписи дней по-русски, «сегодня» в часовом поясе мастера
import { addMonths, eachDayOfInterval, endOfMonth, format, getISODay, startOfMonth } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";
import { useMemo, useState } from "react";

type BookingDateCalendarProps = {
  value: string;
  onChange: (ymd: string) => void;
  timezone: string;
  accentColor: string;
};

/** Сокращения дней недели: сетка начинается с понедельника (ISO 1–7) */
const WEEKDAYS_RU: readonly string[] = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export function BookingDateCalendar({ value, onChange, timezone, accentColor }: BookingDateCalendarProps) {
  // «Сегодня» в таймзоне организации (для min-даты и подсветки)
  const todayYmd = useMemo(() => formatInTimeZone(new Date(), timezone, "yyyy-MM-dd"), [timezone]);

  // Самый ранний месяц, на который можно переключиться (месяц, в котором есть сегодня)
  const minMonthStart = useMemo(() => {
    const [y, m] = todayYmd.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }, [todayYmd]);

  // Месяц отображения; при смене выбранного YYYY-MM родитель задаёт key={YYYY-MM} — компонент монтируется снова
  const [viewMonth, setViewMonth] = useState(() => {
    if (value) {
      const p = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (p) {
        return new Date(Number(p[1]), Number(p[2]) - 1, 1);
      }
    }
    return minMonthStart;
  });

  const monthStart = useMemo(() => startOfMonth(viewMonth), [viewMonth]);
  const monthEnd = useMemo(() => endOfMonth(viewMonth), [viewMonth]);
  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd]
  );

  // Отступ: ISO-день 1 = пн, … 7 = вс → пустых ячеек до 1-го числа = getISODay(monthStart) - 1
  const startPad = getISODay(monthStart) - 1;
  const endPad = (7 - ((startPad + daysInMonth.length) % 7)) % 7;
  const canGoPrev = monthStart.getTime() > minMonthStart.getTime();
  // Заголовок месяца на русском (date-fns locale ru)
  const monthTitle = useMemo(() => {
    const raw = format(monthStart, "LLLL yyyy", { locale: ru });
    return raw.charAt(0).toLocaleUpperCase("ru") + raw.slice(1);
  }, [monthStart]);

  return (
    <div className="mt-2 w-full max-w-sm" role="group" aria-label="Календарь: выбор даты, неделя с понедельника">
      {/* Панель навигации по месяцам */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg border border-stone-200 px-2.5 py-1 text-sm text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:hover:bg-stone-800/80"
          disabled={!canGoPrev}
          onClick={() => canGoPrev && setViewMonth((d) => addMonths(d, -1))}
          aria-label="Предыдущий месяц"
        >
          ←
        </button>
        <span className="min-w-0 flex-1 text-center text-sm font-semibold text-stone-800 dark:text-stone-200">
          {monthTitle}
        </span>
        <button
          type="button"
          className="rounded-lg border border-stone-200 px-2.5 py-1 text-sm text-stone-600 hover:bg-stone-50 dark:border-stone-600 dark:hover:bg-stone-800/80"
          onClick={() => setViewMonth((d) => addMonths(d, 1))}
          aria-label="Следующий месяц"
        >
          →
        </button>
      </div>
      {/* Имена дней недели (рус., порядок пн…вс) */}
      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-stone-500 dark:text-stone-400">
        {WEEKDAYS_RU.map((d) => (
          <div key={d} className="py-1" aria-hidden>
            {d}
          </div>
        ))}
      </div>
      {/* Ячейки месяца: пустые + дни (клик задаёт YYYY-MM-DD) */}
      <div className="mt-0.5 grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }, (_, i) => (
          <div key={`pad-s-${i}`} className="aspect-square" aria-hidden />
        ))}
        {daysInMonth.map((day) => {
          const ymd = format(day, "yyyy-MM-dd");
          const isDisabled = ymd < todayYmd;
          const isSelected = value === ymd;
          const isToday = ymd === todayYmd;
          return (
            <button
              key={ymd}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(ymd)}
              aria-pressed={isSelected}
              aria-label={format(day, "d MMMM yyyy", { locale: ru })}
              className={`flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition ${
                isSelected
                  ? "text-white shadow"
                  : isDisabled
                    ? "cursor-not-allowed text-stone-300 dark:text-stone-600"
                    : "text-stone-800 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800/80"
              } ${
                isToday && !isSelected && !isDisabled
                  ? "ring-1 ring-inset ring-teal-500/50 dark:ring-teal-400/40"
                  : ""
              }`}
              style={isSelected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
            >
              {format(day, "d")}
            </button>
          );
        })}
        {Array.from({ length: endPad }, (_, i) => (
          <div key={`pad-e-${i}`} className="aspect-square" aria-hidden />
        ))}
      </div>
    </div>
  );
}
