// Журнал записей: просмотр и отмена (статус CANCELLED)
"use client";

import { useCallback, useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";

type BookingRow = {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  service: { name: string };
};

type OrgInfo = { timezone: string };

export default function AdminBookingsPage() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [b, o] = await Promise.all([fetch("/api/bookings"), fetch("/api/organization")]);
    if (o.ok) setOrg(await o.json());
    if (b.ok) setRows(await b.json());
  }, []);

  useEffect(() => {
    // Первичная загрузка таблицы записей: запросы идут один раз при монтировании страницы.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
  }, [load]);

  const tz = org?.timezone ?? "UTC";

  const cancelBooking = async (id: string) => {
    if (!confirm("Отменить запись?")) return;
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Записи</h1>
        <p className="text-sm text-stone-600 sm:text-base dark:text-stone-400">
          Все заявки с публичной страницы, до 500 записей
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-stone-500">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-stone-500">Пока нет записей</p>
      ) : (
        <>
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800/40"
              >
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  {formatInTimeZone(r.startsAt, tz, "d MMM yyyy, HH:mm", { locale: ru })}
                </p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{r.service.name}</p>
                <p className="mt-2 text-sm">
                  {r.clientName}
                  <span className="block text-stone-500">{r.clientPhone}</span>
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-medium ${r.status === "CANCELLED" ? "text-stone-500" : "text-teal-800 dark:text-teal-300"}`}
                  >
                    {r.status === "CANCELLED" ? "Отменена" : "Активна"}
                  </span>
                  {r.status !== "CANCELLED" ? (
                    <button
                      type="button"
                      className="min-h-[44px] rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:text-red-400"
                      onClick={() => void cancelBooking(r.id)}
                    >
                      Отменить
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 md:block dark:border-stone-700">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50/90 dark:border-stone-700 dark:bg-stone-800/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Время ({tz})</th>
                  <th className="px-4 py-3 font-medium">Услуга</th>
                  <th className="px-4 py-3 font-medium">Клиент</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-stone-100 dark:border-stone-800">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatInTimeZone(r.startsAt, tz, "d MMM yyyy, HH:mm", { locale: ru })}
                    </td>
                    <td className="px-4 py-3">{r.service.name}</td>
                    <td className="px-4 py-3">
                      {r.clientName}
                      <br />
                      <span className="text-stone-500">{r.clientPhone}</span>
                    </td>
                    <td className="px-4 py-3">{r.status === "CANCELLED" ? "Отменена" : "Активна"}</td>
                    <td className="px-4 py-3 text-right">
                      {r.status !== "CANCELLED" ? (
                        <button
                          type="button"
                          className="text-sm text-red-600 hover:underline"
                          onClick={() => void cancelBooking(r.id)}
                        >
                          Отменить
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
