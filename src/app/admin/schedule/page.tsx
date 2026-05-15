// Расписание: 7 дней с редактированием окон, вырезание перерыва (обед) и отдельно закрытые даты
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBlockedDateLongRu } from "@/lib/blocked-date-ru";
import { RuBlockedDatePicker } from "@/components/admin/RuBlockedDatePicker";
import {
  addSlotRemovingDefaultTemplate,
  AdHocSlotInput,
  applyBreakToDaySlots,
  CALENDAR_DAYS_MON_FIRST,
  findOverlapError,
  findOverlapErrorAdHoc,
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

/** Окна на одну дату (с сервера + локальные id для строк до сохранения) */
type AdHocRow = { id: string; dateStr: string; startMinutes: number; endMinutes: number };

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
  const [adHocSlots, setAdHocSlots] = useState<AdHocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // Черновик одного окна на конкретную дату (отдельно от шаблона пн–вс)
  const [adHocPickDate, setAdHocPickDate] = useState("");
  const [adHocDraftStart, setAdHocDraftStart] = useState("09:00");
  const [adHocDraftEnd, setAdHocDraftEnd] = useState("18:00");

  const load = useCallback(async () => {
    const [w, b, a] = await Promise.all([
      fetch("/api/schedule/weekly"),
      fetch("/api/schedule/blocked"),
      fetch("/api/schedule/ad-hoc"),
    ]);
    if (w.ok) setWeekly(await w.json());
    if (b.ok) setBlocked(await b.json());
    if (a.ok) {
      const raw: unknown = await a.json();
      const list = (Array.isArray(raw) ? raw : []) as { id: string; dateStr: string; startMinutes: number; endMinutes: number }[];
      setAdHocSlots(
        list.map((r) => ({ id: r.id, dateStr: r.dateStr, startMinutes: r.startMinutes, endMinutes: r.endMinutes }))
      );
    }
  }, []);

  useEffect(() => {
    // Первичная загрузка всех частей расписания (недельные окна, исключения, закрытия) с API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  // Сохранение списка «окна на даты» (заменяет весь набор, как weekly)
  const saveAdHoc = async (slots: AdHocSlotInput[]): Promise<boolean> => {
    const res = await fetch("/api/schedule/ad-hoc", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    const raw: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const o = raw as { error?: string; message?: string } | null;
      const text =
        (typeof o?.error === "string" && o.error) ||
        (typeof o?.message === "string" && o.message) ||
        (res.status ? `Ошибка ${res.status}` : "");
      setMsg(
        text ||
          "Не удалось сохранить. Если недавно обновляли проект, выполните в папке saas: npx prisma db push"
      );
      return false;
    }
    if (Array.isArray(raw)) {
      const list = raw as { id: string; dateStr: string; startMinutes: number; endMinutes: number }[];
      setAdHocSlots(list.map((r) => ({ id: r.id, dateStr: r.dateStr, startMinutes: r.startMinutes, endMinutes: r.endMinutes })));
    }
    setMsg("Исключения по датам сохранены");
    setTimeout(() => setMsg(null), 2000);
    return true;
  };

  // Режим правки: для одного окна правим «с»/«до» и сохраняем или отменяем
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  // Встроенная форма в карточке дня (по клику «Добавить окно в этот день»)
  const [addInlineDay, setAddInlineDay] = useState<number | null>(null);
  const [addInlineStart, setAddInlineStart] = useState("09:00");
  const [addInlineEnd, setAddInlineEnd] = useState("18:00");

  // «Вырезать перерыв»: в выбранный день убираем интервал (например 12:00–13:00)
  const [breakDay, setBreakDay] = useState(1);
  const [breakFrom, setBreakFrom] = useState("12:00");
  const [breakTo, setBreakTo] = useState("13:00");

  // Закрытие: одна дата сразу на сервер ИЛИ очередь дат + общая причина пакетом
  const [blockMode, setBlockMode] = useState<"single" | "multiple">("multiple");
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [pendingBlockDates, setPendingBlockDates] = useState<string[]>([]);

  // Переход в «одна дата» сбрасывает черновой список, чтобы не смешивать сценарии
  useEffect(() => {
    if (blockMode === "single") {
      // При переходе в режим одной даты очищаем пакетный список, чтобы не смешивать сценарии.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingBlockDates([]);
    }
  }, [blockMode]);

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
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Расписание</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Вся неделя, включая субботу и воскресенье. Можно задать отдельно часы на конкретные календарные дни (тогда в этот
          день шаблон недели не используется). Перерыв (обед) — кнопкой ниже. Полный выходной — в блоке «Закрытые даты».
        </p>
      </header>

      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      {/* Семь дней: окна приёма с правкой и удалением */}
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
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
                        className="flex flex-col gap-2 rounded-md border border-zinc-100 px-2 py-2 sm:flex-row sm:flex-wrap sm:items-center dark:border-zinc-700"
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
                              className="text-sm text-teal-700 hover:underline"
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
                              className="text-sm text-teal-700 hover:underline"
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
                    className="mt-2 text-xs text-teal-700 hover:underline"
                    onClick={() => {
                      setAddInlineDay(day.dayOfWeek);
                      setAddInlineStart("09:00");
                      setAddInlineEnd("18:00");
                    }}
                  >
                    + Добавить окно в этот день
                  </button>
                  {addInlineDay === day.dayOfWeek ? (
                    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-800 dark:bg-teal-950/30">
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
                        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white"
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
          </div>
        )}
      </section>

      {/* Перерыв: автоматически разбивает окна (например 9–18 + убрать 12–13 → 9–12 и 13–18) */}
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
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

      {/* Календарные исключения: в эти дни вместо «Пн/Вт/…» применяются только указанные окна */}
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="text-sm font-semibold">Часы на отдельные даты</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Например: в этот понедельник работа 3 часа, в следующий — по обычному шаблону. Добавьте дату и интервал; для одного
          дня можно несколько окон. Если дата совпадает с «закрытым днём» — публичная запись в тот день не откроется.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="text-xs text-zinc-500" htmlFor="ad-hoc-date">
              Дата
            </label>
            <RuBlockedDatePicker id="ad-hoc-date" value={adHocPickDate} onChange={setAdHocPickDate} emptyLabel="Когда" />
          </div>
          <div>
            <label className="text-xs text-zinc-500">С</label>
            <input
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={adHocDraftStart}
              onChange={(e) => setAdHocDraftStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">До</label>
            <input
              className="mt-1 rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={adHocDraftEnd}
              onChange={(e) => setAdHocDraftEnd(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="rounded-lg border border-teal-300 bg-white px-3 py-2 text-sm font-medium text-teal-900 dark:border-teal-800 dark:bg-zinc-900 dark:text-teal-100"
            onClick={() => {
              if (!adHocPickDate) {
                setMsg("Укажите дату");
                setTimeout(() => setMsg(null), 2500);
                return;
              }
              const sM = toMinutes(adHocDraftStart);
              const eM = toMinutes(adHocDraftEnd);
              if (sM == null || eM == null || eM <= sM) {
                setMsg("Проверьте интервал «с» / «до»");
                setTimeout(() => setMsg(null), 2500);
                return;
              }
              // Сшиваем с уже добавленными и проверяем пересечения в тот же день
              const asInputs: AdHocSlotInput[] = adHocSlots.map((r) => ({
                dateStr: r.dateStr,
                startMinutes: r.startMinutes,
                endMinutes: r.endMinutes,
              }));
              asInputs.push({ dateStr: adHocPickDate, startMinutes: sM, endMinutes: eM });
              const ov = findOverlapErrorAdHoc(asInputs);
              if (ov) {
                setMsg(ov);
                setTimeout(() => setMsg(null), 4000);
                return;
              }
              setAdHocSlots((prev) => [
                ...prev,
                { id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`, dateStr: adHocPickDate, startMinutes: sM, endMinutes: eM },
              ]);
              setAdHocPickDate("");
            }}
          >
            Добавить окно
          </button>
        </div>
        {adHocSlots.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-900">
            {adHocSlots.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 text-sm text-zinc-800 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-100"
              >
                <span>
                  <span className="font-medium">{formatBlockedDateLongRu(r.dateStr)}</span>{" "}
                  {parseHm(r.startMinutes)}—{parseHm(r.endMinutes)}
                  <span className="ml-1 text-xs text-zinc-400">({r.dateStr})</span>
                </span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-zinc-500 hover:underline"
                  onClick={() => setAdHocSlots((p) => p.filter((x) => x.id !== r.id))}
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">Пока нет исключений — везде действует шаблон недели выше.</p>
        )}
        <button
          type="button"
          className="mt-4 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
          onClick={() => {
            void saveAdHoc(
              adHocSlots.map((r) => ({ dateStr: r.dateStr, startMinutes: r.startMinutes, endMinutes: r.endMinutes }))
            );
          }}
        >
          Сохранить часы на даты
        </button>
        {adHocSlots.length > 0 ? null : (
          <p className="mt-1 text-xs text-zinc-500">Пустой список + «Сохранить» — сбросит все ранее сохранённые исключения.</p>
        )}
      </section>

      {/* Закрытые календарные дни: очередь из нескольких дат, объединённое сохранение */}

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="text-sm font-semibold">Закрытые даты</h2>
        <p className="mt-1 text-xs text-zinc-500">
          В эти дни запись на публичной странице будет недоступна. Одна дата — сразу «Сохранить»; несколько — отметьте дни
          в календаре за один заход (панель не закрывается), затем общая причина и «Сохранить закрытия». Подписи с днём недели —
          по-русски (неделя с понедельника, ISO).
        </p>
        {/* Режим: одна дата или пакет с общей причиной */}
        <div className="mt-4" role="group" aria-label="Режим закрытия дат">
          <p className="text-xs text-zinc-500">Как закрываем</p>
          <div className="mt-1 inline-flex rounded-lg border border-zinc-300 p-0.5 dark:border-zinc-600">
            <button
              type="button"
              className={
                blockMode === "single"
                  ? "rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }
              onClick={() => setBlockMode("single")}
            >
              Одна дата
            </button>
            <button
              type="button"
              className={
                blockMode === "multiple"
                  ? "rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }
              onClick={() => setBlockMode("multiple")}
            >
              Несколько дат
            </button>
          </div>
        </div>

        {blockMode === "single" ? (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs text-zinc-500" htmlFor="block-date-ru">
                  Дата
                </label>
                {/* Один выбор: POST с полями dateStr + reason */}
                <RuBlockedDatePicker id="block-date-ru" value={blockDate} onChange={setBlockDate} />
              </div>
              <div className="min-w-[12rem] flex-1">
                <label className="text-xs text-zinc-500" htmlFor="block-reason-single">
                  Причина (необязательно)
                </label>
                <input
                  id="block-reason-single"
                  className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Например, выходной"
                />
              </div>
              <button
                type="button"
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
                onClick={async () => {
                  if (!blockDate) {
                    setMsg("Выберите дату");
                    setTimeout(() => setMsg(null), 2500);
                    return;
                  }
                  if (blocked.some((b) => b.dateStr === blockDate)) {
                    setMsg("Эта дата уже в закрытых");
                    setTimeout(() => setMsg(null), 2500);
                    return;
                  }
                  const res = await fetch("/api/schedule/blocked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      dateStr: blockDate,
                      reason: blockReason.trim() || undefined,
                    }),
                  });
                  if (res.ok) {
                    setBlockDate("");
                    setBlockReason("");
                    setMsg("Дата закрыта");
                    setTimeout(() => setMsg(null), 2000);
                    load();
                  } else {
                    const raw: unknown = await res.json().catch(() => ({}));
                    const err = raw as { error?: string } | null;
                    setMsg(typeof err?.error === "string" ? err.error : "Не удалось сохранить");
                    setTimeout(() => setMsg(null), 3000);
                  }
                }}
              >
                Сохранить закрытия
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 max-w-md">
              <label className="text-xs text-zinc-500" htmlFor="block-dates-multi">
                Даты
              </label>
              <p className="mb-1 text-xs text-zinc-400">
                Откройте календарь и кликайте по дням — выбирайте сразу несколько, панель не закрывается. Закрытие: клик
                вне области.
              </p>
              {/* Массив YYYY-MM-DD ведёт пикер (mode=multiple), без пошагового «добавить в список» */}
              <RuBlockedDatePicker
                id="block-dates-multi"
                mode="multiple"
                value={pendingBlockDates}
                onChange={setPendingBlockDates}
                disabledDateStrs={blocked.map((b) => b.dateStr)}
                emptyLabel="Открыть календарь"
              />
            </div>
            {pendingBlockDates.length > 0 ? (
              <ul className="mt-3 space-y-1 rounded-lg border border-teal-200 bg-white p-2 dark:border-teal-900 dark:bg-zinc-900">
                {pendingBlockDates.map((ds) => (
                  <li
                    key={ds}
                    className="flex flex-col gap-2 text-sm text-zinc-800 sm:flex-row sm:items-center sm:justify-between dark:text-zinc-100"
                  >
                    <span>
                      {formatBlockedDateLongRu(ds)} <span className="text-xs text-zinc-400">({ds})</span>
                    </span>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-zinc-500 hover:underline"
                      onClick={() => setPendingBlockDates((p) => p.filter((x) => x !== ds))}
                    >
                      Убрать
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="min-w-[200px] flex-1">
                <label className="text-xs text-zinc-500" htmlFor="block-reason-multiple">
                  Общая причина (необязательно) для всех дат в списке
                </label>
                <input
                  id="block-reason-multiple"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-900"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Например, перенос графика"
                />
              </div>
              <button
                type="button"
                className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
                onClick={async () => {
                  if (pendingBlockDates.length === 0) {
                    setMsg("Добавьте хотя бы одну дату в список");
                    setTimeout(() => setMsg(null), 2500);
                    return;
                  }
                  const res = await fetch("/api/schedule/blocked", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      dates: pendingBlockDates,
                      reason: blockReason.trim() || undefined,
                    }),
                  });
                  if (res.ok) {
                    setPendingBlockDates([]);
                    setBlockReason("");
                    setMsg("Даты закрыты");
                    setTimeout(() => setMsg(null), 2000);
                    load();
                  } else {
                    const raw: unknown = await res.json().catch(() => ({}));
                    const err = raw as { error?: string } | null;
                    setMsg(typeof err?.error === "string" ? err.error : "Не удалось сохранить");
                    setTimeout(() => setMsg(null), 3000);
                  }
                }}
              >
                Сохранить закрытия
              </button>
            </div>
          </>
        )}
        <h3 className="mt-6 text-xs font-medium uppercase tracking-wide text-zinc-500">Уже закрыто</h3>
        <ul className="mt-2 space-y-2">
          {blocked.length === 0 ? <li className="text-sm text-zinc-500">Нет закрытых дат</li> : null}
          {blocked.map((b) => (
            <li
              key={b.id}
              className="flex flex-col gap-0.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <span className="text-zinc-900 dark:text-zinc-50">{formatBlockedDateLongRu(b.dateStr)}</span>
                <span className="ml-2 text-xs text-zinc-400">{b.dateStr}</span>
                {b.reason ? <span className="ml-1 text-zinc-600 dark:text-zinc-300">— {b.reason}</span> : null}
              </span>
              <button
                type="button"
                className="shrink-0 self-start text-red-600 hover:underline sm:self-center"
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
