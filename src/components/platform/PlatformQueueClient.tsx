// Список организаций с фильтрами: демо, доступ, пропущено, отклонено
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PLATFORM_CATEGORY_ORDER,
  filterPlatformOrganizations,
  getPlatformAccessCategory,
  PLATFORM_ACCESS_FILTERS,
  PLATFORM_SECTION_LABELS,
  type PlatformAccessFilter,
  type PlatformOrganizationItem,
} from "@/lib/billing-queue";
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

function countByFilter(items: PlatformOrganizationItem[], filterId: PlatformAccessFilter): number {
  return filterPlatformOrganizations(items, filterId).length;
}

type CardProps = {
  item: PlatformOrganizationItem;
  busy: boolean;
  onAction: (organizationId: string, action: "grant" | "defer" | "reject") => void;
};

function OrganizationCard({ item, busy, onAction }: CardProps) {
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
        : inPostDemoQueue && item.billingReviewStatus === "PENDING"
          ? "Ожидает"
          : null;

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
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
                onAction(item.id, "grant");
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
                onClick={() => onAction(item.id, "defer")}
                className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              >
                Пока пропустить
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!confirm(`Отклонить заявку для ${item.ownerEmail}?`)) return;
                  onAction(item.id, "reject");
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
}

export function PlatformQueueClient() {
  const [items, setItems] = useState<PlatformOrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlatformAccessFilter>("all");

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

  const filteredItems = useMemo(() => filterPlatformOrganizations(items, filter), [items, filter]);

  const groupedSections = useMemo(() => {
    if (filter !== "all") return null;
    const sections: { category: (typeof PLATFORM_CATEGORY_ORDER)[number]; items: PlatformOrganizationItem[] }[] = [];
    for (const category of PLATFORM_CATEGORY_ORDER) {
      const sectionItems = items.filter((item) => getPlatformAccessCategory(item) === category);
      if (sectionItems.length > 0) {
        sections.push({ category, items: sectionItems });
      }
    }
    return sections;
  }, [items, filter]);

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

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {PLATFORM_ACCESS_FILTERS.map((tab) => {
          const count = countByFilter(items, tab.id);
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-teal-700 text-white shadow-sm"
                  : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 tabular-nums ${active ? "text-teal-100" : "text-stone-400"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filter !== "all" && filteredItems.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
          В этой категории пока никого нет.
        </p>
      ) : filter === "all" && groupedSections ? (
        <div className="space-y-8">
          {groupedSections.map(({ category, items: sectionItems }) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {PLATFORM_SECTION_LABELS[category]}
                <span className="ml-2 font-normal normal-case text-stone-400">({sectionItems.length})</span>
              </h2>
              <ul className="space-y-4">
                {sectionItems.map((item) => (
                  <OrganizationCard
                    key={item.id}
                    item={item}
                    busy={busyId === item.id}
                    onAction={runAction}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredItems.map((item) => (
            <OrganizationCard key={item.id} item={item} busy={busyId === item.id} onAction={runAction} />
          ))}
        </ul>
      )}
    </>
  );
}
