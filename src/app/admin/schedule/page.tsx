// Расписание: 7 дней с редактированием окон, вырезание перерыва (обед) и отдельно закрытые даты
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addSlotRemovingDefaultTemplate,
  applyBreakToDaySlots,
  CALENDAR_DAYS_MON_FIRST,
  findOverlapError,
  slotsSetsEqual,
  toSlotInputs,
} from "@/lib/weekly-schedule-helpers";

type WeeklySlot = {
  id: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
};

type Blocked = { id: string; dateStr: string; reason: string | null };

/** Минуты с полуночи → «ЧЧ:ММ» для полей ввода */
function parseHm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** «ЧЧ:ММ» → минуты или null при ошибке */
function toMinutes(hm: string): number | null {
  const [a, b] = hm.split(":").map((x) => Number(x));
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return a * 60 + b;
}

export default function AdminSchedulePage() {
  // Текущие слоты с сервера и загрузка
  const [weekly, setWeekly] = useState<WeeklySlot[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [w, b] = await Promise.all([fetch("/api/schedule/weekly"), fetch("/api/schedule/blocked")]);
    if (w.ok) setWeekly(await w.json());
    if (b.ok) setBlocked(await b.json());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Сохранение полного списка окон (сервер заменяет набор целиком), true — если запись на сервер прошла
  const saveWeekly = async (slots: { dayOfWeek: number; startMinutes: number; endMinutes: number }[]): Promise<boolean> => {
    const res = await fetch("/api/schedule/weekly", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    const raw: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const errObj = raw as { error?: string } | null;
      setMsg(typeof errObj?.error === "string" ? errObj.error : "Не удалось сохранить расписание");
      return false;
    }
    if (Array.isArray(raw)) setWeekly(raw as WeeklySlot[]);
    setMsg("Сохранено");
    setTimeout(() => setMsg(null), 2000);
    return true;
  };

  // Режим правки: для одного окна правим «с»/«до» и сохраняем или отменяем
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // Форма «добавить окно» внизу блока — день в календаре (пн=1) и интервал
  const [newDay, setNewDay] = useState(1);
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("18:00");

  // Встроенная форма в карточке дня (по клику «Добавить окно в этот день»)
  const [addInlineDay, setAddInlineDay] = useState<number | null>(null);
  const [addInlineStart, setAddInlineStart] = useState("09:00");
  const [addInlineEnd, setAddInlineEnd] = useState("18:00");

  // «Вырезать перерыв»: в выбранный день убираем интервал (например 12:00–13:00)
  const [breakDay, setBreakDay] = useState(1);
  const [breakFrom, setBreakFrom] = useState("12:00");
  const [breakTo, setBreakTo] = useState("13:00");

  // Блоки календаря по дате (уже были)
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");

  // Слоты сгруппированы по дням (порядок пн–вс)
  const byDay = useMemo(() => {
    const m = new Map<number, WeeklySlot[]>();
    for (const d of CALENDAR_DAYS_MON_FIRST) {
      m.set(
        d.dayOfWeek,
        weekly
          .filter((s) => s.dayOfWeek === d.dayOfWeek)
          .sort((a, b) => a.startMinutes - b.startMinutes)
      );
    }
    return m;
  }, [weekly]);

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Расписание</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Вся неделя, включая субботу и воскресенье. Для каждого дня — одно или несколько окон; перерыв (обед) можно
          убрать отдельной кнопкой. Плюс полный выходной по конкретной дате.
        </p>
      </header>

      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      {/* Семь дней: окна приёма с правкой и удалением */}
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="text-sm font-semibold">Часы по дням недели</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Примеры: 09:00–12:00 и 13:00–18:00, без перекрытий. Пересекающиеся окна в один день не сохраняются. Если в этот
          день пока одно стандартное 09:00–18:00, при добавлении нового окна оно снимается, чтобы не дублировать время
          (дальше при необходимости добавьте остальные слоты отдельно).
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Загрузка…</p>
        ) : (
          <div className="mt-4 space-y-6">
            {CALENDAR_DAYS_MON_FIRST.map((day) => {
              const rows = byDay.get(day.dayOfWeek) ?? [];
              return (
                <div key={day.dayOfWeek} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900">
                  <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{day.label}</h3>
                  <ul className="mt-2 space-y-2">
                    {rows.length === 0 ? (
                      <li className="text-xs text-zinc-500">Нет окон — день выходной</li>
                    ) : null}
                    {rows.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-100 px-2 py-1.5 dark:border-zinc-700"
                      >
                        {editingId === s.id ? (
                          <>
                            <input
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              aria-label="С"
                            />
                            <span className="text-zinc-400">—</span>
                            <input
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              aria-label="До"
                            />
                            <button
                              type="button"
                              className="text-sm text-indigo-600 hover:underline"
                              onClick={async () => {
                                const sm = toMinutes(editStart);
                                const em = toMinutes(editEnd);
                                if (sm == null || em == null || em <= sm) {
                                  setMsg("Проверьте время");
                                  return;
                                }
                                const next = weekly
                                  .filter((x) => x.id !== s.id)
                                  .map((x) => ({
                                    dayOfWeek: x.dayOfWeek,
                                    startMinutes: x.startMinutes,
                                    endMinutes: x.endMinutes,
                                  }));
                                next.push({ dayOfWeek: s.dayOfWeek, startMinutes: sm, endMinutes: em });
                                const overlap = findOverlapError(next);
                                if (overlap) {
                                  setMsg(overlap);
                                  return;
                                }
                                const ok = await saveWeekly(next);
                                if (ok) setEditingId(null);
                              }}
                            >
                              Сохранить
                            </button>
                            <button
                              type="button"
                              className="text-sm text-zinc-500 hover:underline"
                              onClick={() => setEditingId(null)}
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-sm">
                              {parseHm(s.startMinutes)} — {parseHm(s.endMinutes)}
                            </span>
                            <button
                              type="button"
                              className="text-sm text-indigo-600 hover:underline"
                              onClick={() => {
                                setEditingId(s.id);
                                setEditStart(parseHm(s.startMinutes));
                                setEditEnd(parseHm(s.endMinutes));
                              }}
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              className="text-sm text-red-600 hover:underline"
                              onClick={() => {
                                const next = weekly
                                  .filter((x) => x.id !== s.id)
                                  .map((x) => ({
                                    dayOfWeek: x.dayOfWeek,
                                    startMinutes: x.startMinutes,
                                    endMinutes: x.endMinutes,
                                  }));
                                saveWeekly(next);
                              }}
                            >
                              Удалить
                            </button>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-2 text-xs text-indigo-600 hover:underline"
                    onClick={() => {
                      setAddInlineDay(day.dayOfWeek);
                      setAddInlineStart("09:00");
                      setAddInlineEnd("18:00");
                      setNewDay(day.dayOfWeek);
                    }}
                  >
                    + Добавить окно в этот день
                  </button>
                  {addInlineDay === day.dayOfWeek ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
                      <p className="w-full text-xs text-zinc-600 dark:text-zinc-300">Время для нового окна</p>
                      <div>
                        <label className="text-xs text-zinc-500">С</label>
                        <input
                          className="mt-1 block rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                          value={addInlineStart}
                          onChange={(e) => setAddInlineStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">До</label>
                        <input
                          className="mt-1 block rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                          value={addInlineEnd}
                          onChange={(e) => setAddInlineEnd(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                        onClick={async () => {
                          const sm = toMinutes(addInlineStart);
                          const em = toMinutes(addInlineEnd);
                          if (sm == null || em == null || em <= sm) {
                            setMsg("Проверьте время");
                            return;
                          }
                          const { slots: next, error } = addSlotRemovingDefaultTemplate(toSlotInputs(weekly), {
                            dayOfWeek: day.dayOfWeek,
                            startMinutes: sm,
                            endMinutes: em,
                          });
                          if (error) {
                            setMsg(error);
                            return;
                          }
                          const ok = await saveWeekly(next);
                          if (ok) setAddInlineDay(null);
                        }}
                      >
                        Сохранить окно
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900"
                        onClick={() => setAddInlineDay(null)}
                      >
                        Отмена
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {/* Добавление нового окна: день + интервал */}

            <div className="flex flex-wrap items-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
              <div>
                <label className="text-xs text-zinc-500">День</label>
                <select
                  className="mt-1 block rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                  value={newDay}
                  onChange={(e) => setNewDay(Number(e.target.value))}
                >
                  {CALENDAR_DAYS_MON_FIRST.map((d) => (
                    <option key={d.dayOfWeek} value={d.dayOfWeek}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">С</label>
                <input
                  className="mt-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">До</label>
                <input
                  className="mt-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                onClick={async () => {
                  const sm = toMinutes(newStart);
                  const em = toMinutes(newEnd);
                  if (sm == null || em == null || em <= sm) {
                    setMsg("Проверьте время");
                    return;
                  }
                  const { slots: next, error } = addSlotRemovingDefaultTemplate(toSlotInputs(weekly), {
                    dayOfWeek: newDay,
                    startMinutes: sm,
                    endMinutes: em,
                  });
                  if (error) {
                    setMsg(error);
                    return;
                  }
                  void saveWeekly(next);
                }}
              >
                Добавить окно
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Перерыв: автоматически разбивает окна (например 9–18 + убрать 12–13 → 9–12 и 13–18) */}
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="text-sm font-semibold">Убрать время в дне (перерыв)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Укажите интервал, который нужно сделать без записи (обед, отъезд). Подходящие окна разобьются на до и после
          перерыва.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-zinc-500">День</label>
            <select
              className="mt-1 block rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={breakDay}
              onChange={(e) => setBreakDay(Number(e.target.value))}
            >
              {CALENDAR_DAYS_MON_FIRST.map((d) => (
                <option key={d.dayOfWeek} value={d.dayOfWeek}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">С</label>
            <input
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={breakFrom}
              onChange={(e) => setBreakFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">До</label>
            <input
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={breakTo}
              onChange={(e) => setBreakTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white"
            onClick={() => {
              const bS = toMinutes(breakFrom);
              const bE = toMinutes(breakTo);
              if (bS == null || bE == null || bE <= bS) {
                setMsg("Проверьте перерыв");
                return;
              }
              const before = toSlotInputs(weekly);
              const next = applyBreakToDaySlots(before, breakDay, bS, bE).filter((s) => s.endMinutes > s.startMinutes);
              if (slotsSetsEqual(before, next)) {
                setMsg("Нет окон, пересекающихся с этим интервалом");
                setTimeout(() => setMsg(null), 3000);
                return;
              }
              void saveWeekly(next);
            }}
          >
            Добавить перерыв
          </button>
        </div>
      </section>

      {/* Блокировка целых дат (уже существовала) */}

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="text-sm font-semibold">Закрытые даты</h2>
        <p className="mt-1 text-xs text-zinc-500">В эти дни запись на публичной странице будет недоступна</p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-zinc-500">Дата</label>
            <input
              type="date"
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="text-xs text-zinc-500">Причина (необязательно)</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
            onClick={async () => {
              if (!blockDate) return;
              const res = await fetch("/api/schedule/blocked", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ dateStr: blockDate, reason: blockReason || undefined }),
              });
              if (res.ok) {
                setBlockDate("");
                setBlockReason("");
                load();
              }
            }}
          >
            Закрыть день
          </button>
        </div>
        <ul className="mt-4 space-y-1">
          {blocked.map((b) => (
            <li key={b.id} className="flex items-center justify-between text-sm">
              <span>
                {b.dateStr}
                {b.reason ? ` — ${b.reason}` : ""}
              </span>
              <button
                type="button"
                className="text-red-600 hover:underline"
                onClick={async () => {
                  await fetch(`/api/schedule/blocked/${b.id}`, { method: "DELETE" });
                  load();
                }}
              >
                Снять
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
