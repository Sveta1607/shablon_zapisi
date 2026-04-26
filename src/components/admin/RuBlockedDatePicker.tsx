// Поле даты для закрытых дней: ДД.ММ.ГГГГ, календарь ru, Пн первым; single — одна дата, multiple — без закрытия панели при клике
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

// Строка YYYY-MM-DD (как в API) → локальная дата полуночи, без сдвига по UTC
function ymdToDate(ymd: string): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return null;
  }
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

// Локальная дата → строка YYYY-MM-DD для состояния и бэкенда
function dateToYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Общие tailwind+rdp classNames, чтобы single и multiple выглядели одинаково
const rdpClassNames = {
  month: "rdp-month min-w-[18rem]",
  month_caption: "rdp-month_caption !h-auto justify-center font-medium text-zinc-800 dark:text-zinc-200",
  nav: "rdp-nav",
  month_grid: "rdp-month_grid w-full min-w-[18rem] table-fixed",
  weeks: "rdp-weeks",
  weekdays: "rdp-weekdays",
  week: "rdp-week",
  weekday: "rdp-weekday w-[2.25rem] min-w-[2.25rem] max-w-[2.25rem] text-center text-xs font-medium text-zinc-500 dark:text-zinc-400",
  day: "rdp-day w-[2.25rem] min-w-[2.25rem]",
  day_button: "rdp-day_button rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
  selected:
    "rdp-selected [&_.rdp-day_button]:!bg-teal-700 [&_.rdp-day_button]:!text-white [&_.rdp-day_button]:!border-teal-700 dark:[&_.rdp-day_button]:!bg-teal-600 dark:[&_.rdp-day_button]:!border-teal-600",
  today: "rdp-today font-semibold text-teal-800 dark:text-teal-300",
  disabled: "rdp-disabled text-zinc-400 opacity-50 dark:text-zinc-500 [&_.rdp-day_button]:pointer-events-none",
} as const;

// Лимит как в API пакетного POST
const MAX_PICK = 400;

type SingleProps = {
  mode?: "single";
  value: string;
  onChange: (ymd: string) => void;
  id?: string;
  emptyLabel?: string;
};

type MultipleProps = {
  mode: "multiple";
  value: string[];
  onChange: (ymds: string[]) => void;
  /** Даты, уже закрытые на сервере — клик по ним отключён */
  disabledDateStrs?: string[];
  id?: string;
  /** Подсказка на кнопке при пустом выборе */
  emptyLabel?: string;
};

export type RuBlockedDatePickerProps = SingleProps | MultipleProps;

/**
 * single: кнопка + один день, после выбора панель закрывается.
 * multiple: кнопка + несколько дней подряд в открытой панели (onChange при каждом клике, панель не закрываем).
 */
export function RuBlockedDatePicker(props: RuBlockedDatePickerProps) {
  const isMulti = props.mode === "multiple";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // Уже закрытые YYYY-MM-DD (только в режиме multiple) — в функции isDisabled
  const disabledYmdList = isMulti && "disabledDateStrs" in props ? props.disabledDateStrs : undefined;

  const notBeforeToday = useMemo(() => startOfDay(new Date()), [open]);

  // single: только «до сегодня»; multiple: + даты, которые уже в базе
  const disabledMatch = useMemo(() => {
    if (!isMulti) {
      return { before: notBeforeToday };
    }
    const extra = disabledYmdList?.map(ymdToDate).filter((d): d is Date => d != null) ?? [];
    return (date: Date) => {
      const day = startOfDay(date);
      if (isBefore(day, notBeforeToday)) {
        return true;
      }
      return extra.some((d) => startOfDay(d).getTime() === day.getTime());
    };
  }, [isMulti, notBeforeToday, disabledYmdList]);

  const selectedSingle = !isMulti && props.value ? ymdToDate(props.value) : undefined;
  const selectedMulti = isMulti
    ? props.value.map(ymdToDate).filter((d): d is Date => d != null)
    : undefined;

  // Подпись на кнопке-триггере
  const buttonLabel = isMulti
    ? props.value.length === 0
      ? (props.emptyLabel ?? "Выберите даты")
      : `Выбрано дат: ${props.value.length}`
    : selectedSingle
      ? format(selectedSingle, "dd.MM.yyyy", { locale: ru })
      : (props.emptyLabel ?? "Выберите дату");

  // Скрытие панели по клику снаружи
  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* Триггер: для multiple показываем число выбранных, не дату-одиночку */}
      <button
        type="button"
        id={props.id}
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full min-w-[12rem] items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-sm text-zinc-900 shadow-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {isMulti && props.value.length === 0 ? (
          <span className="text-zinc-400">{buttonLabel}</span>
        ) : isMulti ? (
          <span className="font-medium">{buttonLabel}</span>
        ) : selectedSingle ? (
          format(selectedSingle, "dd.MM.yyyy", { locale: ru })
        ) : (
          <span className="text-zinc-400">{props.emptyLabel ?? "Выберите дату"}</span>
        )}
        <span className="ml-2 text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="rdp-surface absolute left-0 top-full z-50 mt-1 min-w-[19rem] rounded-lg border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
          role="dialog"
          aria-label="Календарь"
        >
          {isMulti ? (
            <DayPicker
              mode="multiple"
              max={MAX_PICK}
              required={false}
              selected={selectedMulti}
              onSelect={(dates) => {
                const ymds = (dates ?? []).map(dateToYmd).sort();
                (props as MultipleProps).onChange(ymds);
              }}
              disabled={disabledMatch}
              locale={ru}
              weekStartsOn={1}
              defaultMonth={selectedMulti && selectedMulti.length > 0 ? selectedMulti[0] : new Date()}
              className="!p-0 text-sm text-zinc-900 dark:text-zinc-100"
              classNames={rdpClassNames}
            />
          ) : (
            <DayPicker
              mode="single"
              required={false}
              selected={selectedSingle ?? undefined}
              onSelect={(d) => {
                (props as SingleProps).onChange(d ? dateToYmd(d) : "");
                setOpen(false);
              }}
              disabled={disabledMatch}
              locale={ru}
              weekStartsOn={1}
              defaultMonth={selectedSingle ?? new Date()}
              className="!p-0 text-sm text-zinc-900 dark:text-zinc-100"
              classNames={rdpClassNames}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
