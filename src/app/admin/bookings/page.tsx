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
    load().finally(() => setLoading(false));
  }, [load]);

  const tz = org?.timezone ?? "UTC";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Записи</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Все заявки с публичной страницы, до 500 записей</p>
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500">Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Пока нет записей</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
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
                <tr key={r.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatInTimeZone(r.startsAt, tz, "d MMM yyyy, HH:mm", { locale: ru })}
                  </td>
                  <td className="px-4 py-3">{r.service.name}</td>
                  <td className="px-4 py-3">
                    {r.clientName}
                    <br />
                    <span className="text-zinc-500">{r.clientPhone}</span>
                  </td>
                  <td className="px-4 py-3">{r.status === "CANCELLED" ? "Отменена" : "Активна"}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status !== "CANCELLED" ? (
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        onClick={async () => {
                          if (!confirm("Отменить запись?")) return;
                          await fetch(`/api/bookings/${r.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: "CANCELLED" }),
                          });
                          load();
                        }}
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
      )}
    </div>
  );
}
