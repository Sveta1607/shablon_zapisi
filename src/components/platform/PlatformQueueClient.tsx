// Очередь после демо: кнопки дать доступ / пропустить / отклонить
"use client";

import { useCallback, useEffect, useState } from "react";
import type { BillingQueueItem } from "@/lib/billing-queue";

type QueueResponse = { items: BillingQueueItem[]; count: number };

export function PlatformQueueClient() {
  const [items, setItems] = useState<BillingQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/platform/queue", { cache: "no-store" });
    if (res.status === 401) {
      window.location.href = "/platform/login";
      return;
    }
    const data = (await res.json().catch(() => ({}))) as Partial<QueueResponse> & { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Не удалось загрузить очередь");
      return;
    }
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(organizationId: string, action: "grant" | "defer" | "reject") {
    setBusyId(organizationId);
    const res = await fetch(`/api/platform/queue/${organizationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusyId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(typeof d.error === "string" ? d.error : "Ошибка действия");
      return;
    }
    await load();
  }

  if (loading) {
    return <p className="text-sm text-stone-500">Загрузка очереди…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
        В очереди никого нет — все с активным демо, с доступом после оплаты или отклонённые.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const busy = busyId === item.id;
        const statusLabel =
          item.billingReviewStatus === "DEFERRED" ? "Отложено" : "Ожидает";
        return (
          <li
            key={item.id}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-stone-900 dark:text-stone-50">{item.businessName}</p>
                <p className="mt-1 break-all text-sm text-teal-800 dark:text-teal-300">{item.ownerEmail}</p>
                {item.ownerName ? (
                  <p className="text-sm text-stone-500">{item.ownerName}</p>
                ) : null}
                <p className="mt-2 font-mono text-xs text-stone-500">/book/{item.slug}</p>
              </div>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                {statusLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Демо закончилось{" "}
              {new Date(item.trialEndedAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {item.daysSinceTrialEnd > 0 ? ` (${item.daysSinceTrialEnd} дн. назад)` : " (сегодня)"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(item.id, "grant")}
                className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
              >
                Дать доступ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => runAction(item.id, "defer")}
                className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              >
                Пока пропустить
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!confirm(`Отклонить заявку для ${item.ownerEmail}?`)) return;
                  runAction(item.id, "reject");
                }}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              >
                Отклонить
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
