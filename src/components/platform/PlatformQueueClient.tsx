// Список всех организаций: демо, дни до конца, подтверждение доступа
"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlatformOrganizationItem } from "@/lib/billing-queue";
import type { OrgAccessPhase } from "@/lib/org-access";

type QueueResponse = { items: PlatformOrganizationItem[]; count: number };

function dayWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "день";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "дня";
  return "дней";
}

function phaseLabel(phase: OrgAccessPhase): string {
  switch (phase) {
    case "trial":
      return "Демо";
    case "demo_expired":
      return "Демо закончилось";
    case "purchased":
      return "Доступ открыт";
    case "suspended":
      return "Заблокирован";
  }
}

function phaseBadgeClass(phase: OrgAccessPhase): string {
  switch (phase) {
    case "trial":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
    case "demo_expired":
      return "bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200";
    case "purchased":
      return "bg-teal-100 text-teal-900 dark:bg-teal-950/50 dark:text-teal-200";
    case "suspended":
      return "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200";
  }
}

export function PlatformQueueClient() {
  const [items, setItems] = useState<PlatformOrganizationItem[]>([]);
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
      setError(typeof data.error === "string" ? data.error : "Не удалось загрузить список");
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
    return <p className="text-sm text-stone-500">Загрузка…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
        Пока нет зарегистрированных пользователей.
      </p>
    );
  }

  const trialCount = items.filter((i) => i.accessPhase === "trial").length;
  const queueCount = items.filter(
    (i) =>
      i.accessPhase === "demo_expired" &&
      !i.servicePurchasedAt &&
      (i.billingReviewStatus === "PENDING" || i.billingReviewStatus === "DEFERRED")
  ).length;

  return (
    <>
      <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
        Всего: {items.length}
        {trialCount > 0 ? ` · на демо: ${trialCount}` : ""}
        {queueCount > 0 ? ` · в очереди после демо: ${queueCount}` : ""}
      </p>
      <ul className="space-y-4">
        {items.map((item) => {
          const busy = busyId === item.id;
          const canGrant = !item.servicePurchasedAt && item.accessPhase !== "suspended";
          const inPostDemoQueue =
            item.accessPhase === "demo_expired" &&
            !item.servicePurchasedAt &&
            (item.billingReviewStatus === "PENDING" || item.billingReviewStatus === "DEFERRED");
          const queueStatusLabel =
            item.billingReviewStatus === "DEFERRED"
              ? "Отложено"
              : item.billingReviewStatus === "REJECTED"
                ? "Отклонено"
                : inPostDemoQueue
                  ? "Ожидает"
                  : null;

          return (
            <li
              key={item.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 dark:text-stone-50">{item.businessName}</p>
                  <p className="mt-1 break-all text-sm text-teal-800 dark:text-teal-300">{item.ownerEmail}</p>
                  {item.ownerName ? <p className="text-sm text-stone-500">{item.ownerName}</p> : null}
                  {!item.emailVerified ? (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Почта не подтверждена</p>
                  ) : null}
                  <p className="mt-2 font-mono text-xs text-stone-500">/book/{item.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${phaseBadgeClass(item.accessPhase)}`}
                  >
                    {phaseLabel(item.accessPhase)}
                  </span>
                  {queueStatusLabel ? (
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      {queueStatusLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              <p className="mt-2 text-xs text-stone-500">
                {item.accessPhase === "trial" ? (
                  item.demoDaysRemaining > 0 ? (
                    <>
                      До конца демо:{" "}
                      <span className="font-medium text-amber-800 dark:text-amber-200">{item.demoDaysRemaining}</span>{" "}
                      {dayWord(item.demoDaysRemaining)} (до{" "}
                      {new Date(item.trialEndsAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                      })}
                      )
                    </>
                  ) : (
                    <>Демо заканчивается сегодня</>
                  )
                ) : item.accessPhase === "demo_expired" ? (
                  <>
                    Демо закончилось{" "}
                    {new Date(item.trialEndsAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {item.daysSinceTrialEnd > 0
                      ? ` (${item.daysSinceTrialEnd} ${dayWord(item.daysSinceTrialEnd)} назад)`
                      : " (сегодня)"}
                  </>
                ) : item.accessPhase === "purchased" && item.servicePurchasedAt ? (
                  <>
                    Доступ с{" "}
                    {new Date(item.servicePurchasedAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </>
                ) : (
                  <>
                    Зарегистрирован{" "}
                    {new Date(item.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </>
                )}
              </p>

              {canGrant || inPostDemoQueue ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {canGrant ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const early = item.accessPhase === "trial";
                        const msg = early
                          ? `Подтвердить доступ для ${item.ownerEmail} до окончания демо?`
                          : `Дать доступ для ${item.ownerEmail}?`;
                        if (!confirm(msg)) return;
                        runAction(item.id, "grant");
                      }}
                      className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
                    >
                      {item.accessPhase === "trial" ? "Подтвердить доступ" : "Дать доступ"}
                    </button>
                  ) : null}
                  {inPostDemoQueue ? (
                    <>
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
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
