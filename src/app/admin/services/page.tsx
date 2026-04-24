// Управление услугами: список, добавление, редактирование длительности/цены, вкл/выкл, удаление
"use client";

import { useCallback, useEffect, useState } from "react";

type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number | null;
  active: boolean;
  sortOrder: number;
};

export default function AdminServicesPage() {
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [priceRub, setPriceRub] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/services");
    if (!res.ok) {
      setError("Не удалось загрузить услуги");
      return;
    }
    setList(await res.json());
    setError(null);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Услуги</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Что клиент выбирает на публичной странице записи</p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Новая услуга</h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            const priceCents =
              priceRub.trim() === "" ? null : Math.round(parseFloat(priceRub.replace(",", ".")) * 100);
            if (priceRub.trim() !== "" && Number.isNaN(priceCents)) {
              setError("Некорректная цена");
              return;
            }
            const res = await fetch("/api/services", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name,
                durationMinutes: duration,
                priceCents,
              }),
            });
            if (!res.ok) {
              setError("Не удалось создать");
              return;
            }
            setName("");
            setDuration(60);
            setPriceRub("");
            load();
          }}
        >
          <div className="min-w-[180px] flex-1">
            <label className="text-xs font-medium text-zinc-500">Название</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Стрижка"
            />
          </div>
          <div className="w-28">
            <label className="text-xs font-medium text-zinc-500">Минуты</label>
            <input
              type="number"
              min={5}
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </div>
          <div className="w-32">
            <label className="text-xs font-medium text-zinc-500">Цена ₽</label>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
              value={priceRub}
              onChange={(e) => setPriceRub(e.target.value)}
              placeholder="—"
            />
          </div>
          <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            Добавить
          </button>
        </form>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section>
        <h2 className="text-lg font-semibold">Список</h2>
        {loading ? (
          <p className="text-sm text-zinc-500">Загрузка…</p>
        ) : list.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Добавьте хотя бы одну услугу — иначе клиентам не на что записаться</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {list.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <div>
                  <span className="font-medium">{s.name}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    {s.durationMinutes} мин
                    {s.priceCents != null ? ` · ${(s.priceCents / 100).toLocaleString("ru-RU")} ₽` : ""}
                  </span>
                  {!s.active ? <span className="ml-2 text-xs text-amber-600">скрыта</span> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
                    onClick={async () => {
                      await fetch(`/api/services/${s.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ active: !s.active }),
                      });
                      load();
                    }}
                  >
                    {s.active ? "Скрыть" : "Показать"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
                    onClick={async () => {
                      if (!confirm("Удалить услугу?")) return;
                      await fetch(`/api/services/${s.id}`, { method: "DELETE" });
                      load();
                    }}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
