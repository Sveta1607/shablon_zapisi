// Список организаций платформы: демо, очередь после демо, выдача доступа
import { addDays } from "date-fns";
import type { BillingReviewStatus } from "@prisma/client";
import {
  DEMO_TRIAL_DAYS,
  getDemoDaysRemaining,
  getOrganizationAccessPhase,
  type OrgAccessPhase,
} from "@/lib/org-access";
import { prisma } from "@/lib/prisma";

/** Карточка организации в панели платформы (все зарегистрированные владельцы) */
export type PlatformOrganizationItem = {
  id: string;
  slug: string;
  businessName: string;
  ownerEmail: string;
  ownerName: string | null;
  emailVerified: boolean;
  createdAt: string;
  trialEndsAt: string;
  accessPhase: OrgAccessPhase;
  demoDaysRemaining: number;
  daysSinceTrialEnd: number;
  servicePurchasedAt: string | null;
  billingReviewStatus: BillingReviewStatus;
  billingDeferredAt: string | null;
};

/** @deprecated Используйте PlatformOrganizationItem */
export type BillingQueueItem = PlatformOrganizationItem & {
  trialEndedAt: string;
};

type OrgRow = {
  id: string;
  slug: string;
  businessName: string;
  createdAt: Date;
  suspended: boolean;
  servicePurchasedAt: Date | null;
  billingReviewStatus: BillingReviewStatus;
  billingDeferredAt: Date | null;
  ownerEmail: string;
  ownerName: string | null;
  emailVerifiedAt: Date | null;
};

function trialEndsAt(createdAt: Date): Date {
  return addDays(createdAt, DEMO_TRIAL_DAYS);
}

function isDemoExpired(createdAt: Date, now: Date): boolean {
  return now >= trialEndsAt(createdAt);
}

function daysSinceTrialEnd(createdAt: Date, now: Date): number {
  const end = trialEndsAt(createdAt);
  return Math.max(0, Math.floor((now.getTime() - end.getTime()) / (24 * 60 * 60 * 1000)));
}

function rowToPlatformItem(row: OrgRow, now: Date): PlatformOrganizationItem {
  const orgRecord = {
    suspended: row.suspended,
    createdAt: row.createdAt,
    servicePurchasedAt: row.servicePurchasedAt,
  };
  const accessPhase = getOrganizationAccessPhase(orgRecord, now);
  const end = trialEndsAt(row.createdAt);

  return {
    id: row.id,
    slug: row.slug,
    businessName: row.businessName,
    ownerEmail: row.ownerEmail,
    ownerName: row.ownerName,
    emailVerified: row.emailVerifiedAt != null,
    createdAt: row.createdAt.toISOString(),
    trialEndsAt: end.toISOString(),
    accessPhase,
    demoDaysRemaining: accessPhase === "trial" ? getDemoDaysRemaining(orgRecord, now) : 0,
    daysSinceTrialEnd: accessPhase === "demo_expired" ? daysSinceTrialEnd(row.createdAt, now) : 0,
    servicePurchasedAt: row.servicePurchasedAt?.toISOString() ?? null,
    billingReviewStatus: row.billingReviewStatus,
    billingDeferredAt: row.billingDeferredAt?.toISOString() ?? null,
  };
}

/** Категория для фильтров и группировки в панели платформы */
export type PlatformAccessCategory =
  | "trial"
  | "pending"
  | "purchased"
  | "deferred"
  | "rejected"
  | "other";

export type PlatformAccessFilter = "all" | PlatformAccessCategory;

/** Определяет вкладку/секцию для организации */
export function getPlatformAccessCategory(item: PlatformOrganizationItem): PlatformAccessCategory {
  if (item.servicePurchasedAt || item.accessPhase === "purchased") return "purchased";
  if (item.billingReviewStatus === "REJECTED") return "rejected";
  if (item.billingReviewStatus === "DEFERRED") return "deferred";
  if (item.accessPhase === "trial") return "trial";
  if (item.accessPhase === "demo_expired" && item.billingReviewStatus === "PENDING") return "pending";
  return "other";
}

export const PLATFORM_CATEGORY_ORDER: PlatformAccessCategory[] = [
  "pending",
  "trial",
  "purchased",
  "deferred",
  "rejected",
  "other",
];

function compareWithinCategory(a: PlatformOrganizationItem, b: PlatformOrganizationItem): number {
  const cat = getPlatformAccessCategory(a);
  if (cat === "trial") return a.demoDaysRemaining - b.demoDaysRemaining;
  if (cat === "pending") {
    return new Date(a.trialEndsAt).getTime() - new Date(b.trialEndsAt).getTime();
  }
  if (cat === "deferred") {
    const da = a.billingDeferredAt ? new Date(a.billingDeferredAt).getTime() : 0;
    const db = b.billingDeferredAt ? new Date(b.billingDeferredAt).getTime() : 0;
    return da - db;
  }
  if (cat === "purchased") {
    const pa = a.servicePurchasedAt ? new Date(a.servicePurchasedAt).getTime() : 0;
    const pb = b.servicePurchasedAt ? new Date(b.servicePurchasedAt).getTime() : 0;
    return pb - pa;
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

/** Сортировка: ожидает → демо → доступ → пропущено → отклонено */
function sortPlatformOrganizations(items: PlatformOrganizationItem[]): PlatformOrganizationItem[] {
  return [...items].sort((a, b) => {
    const ca = getPlatformAccessCategory(a);
    const cb = getPlatformAccessCategory(b);
    const ia = PLATFORM_CATEGORY_ORDER.indexOf(ca);
    const ib = PLATFORM_CATEGORY_ORDER.indexOf(cb);
    if (ia !== ib) return ia - ib;
    return compareWithinCategory(a, b);
  });
}

export function filterPlatformOrganizations(
  items: PlatformOrganizationItem[],
  filter: PlatformAccessFilter
): PlatformOrganizationItem[] {
  if (filter === "all") return items;
  return items.filter((item) => getPlatformAccessCategory(item) === filter);
}

export const PLATFORM_ACCESS_FILTERS: {
  id: PlatformAccessFilter;
  label: string;
}[] = [
  { id: "all", label: "Все" },
  { id: "trial", label: "Демо" },
  { id: "purchased", label: "Доступ открыт" },
  { id: "deferred", label: "Пропущено" },
  { id: "rejected", label: "Доступ отклонён" },
];

export const PLATFORM_SECTION_LABELS: Record<PlatformAccessCategory, string> = {
  trial: "Демо",
  pending: "Ожидает решения",
  purchased: "Доступ открыт",
  deferred: "Пропущено",
  rejected: "Доступ отклонён",
  other: "Прочее",
};

/** Все зарегистрированные организации (владельцы) для панели платформы */
export async function listAllPlatformOrganizations(now = new Date()): Promise<PlatformOrganizationItem[]> {
  const rows = await prisma.$queryRaw<OrgRow[]>`
    SELECT
      o."id",
      o."slug",
      o."businessName",
      o."createdAt",
      o."suspended",
      o."servicePurchasedAt",
      o."billingReviewStatus",
      o."billingDeferredAt",
      u."email" AS "ownerEmail",
      u."name" AS "ownerName",
      u."emailVerifiedAt"
    FROM "Organization" o
    INNER JOIN "User" u ON u."id" = o."ownerId"
    ORDER BY o."createdAt" DESC
  `;

  return sortPlatformOrganizations(rows.map((row) => rowToPlatformItem(row, now)));
}

/** Организации с истёкшим демо без покупки, в очереди (не отклонены) */
export async function listBillingQueue(now = new Date()): Promise<BillingQueueItem[]> {
  const all = await listAllPlatformOrganizations(now);
  return all
    .filter(
      (item) =>
        item.accessPhase === "demo_expired" &&
        !item.servicePurchasedAt &&
        (item.billingReviewStatus === "PENDING" || item.billingReviewStatus === "DEFERRED")
    )
    .map((item) => ({ ...item, trialEndedAt: item.trialEndsAt }));
}

export async function grantOrganizationAccess(organizationId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Organization"
    SET
      "servicePurchasedAt" = NOW(),
      "billingReviewStatus" = 'PENDING'::"BillingReviewStatus",
      "billingDeferredAt" = NULL,
      "billingRejectedAt" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${organizationId}
  `;
}

export async function deferOrganizationReview(organizationId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Organization"
    SET
      "billingReviewStatus" = 'DEFERRED'::"BillingReviewStatus",
      "billingDeferredAt" = NOW(),
      "updatedAt" = NOW()
    WHERE "id" = ${organizationId}
  `;
}

export async function rejectOrganizationReview(organizationId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Organization"
    SET
      "billingReviewStatus" = 'REJECTED'::"BillingReviewStatus",
      "billingRejectedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE "id" = ${organizationId}
  `;
}

export async function getOwnerBillingReviewStatus(
  userId: string
): Promise<BillingReviewStatus | null> {
  const rows = await prisma.$queryRaw<
    { billingReviewStatus: BillingReviewStatus; createdAt: Date; servicePurchasedAt: Date | null; suspended: boolean }[]
  >`
    SELECT o."billingReviewStatus", o."createdAt", o."servicePurchasedAt", o."suspended"
    FROM "Organization" o
    WHERE o."ownerId" = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row || row.suspended || row.servicePurchasedAt) return null;
  if (!isDemoExpired(row.createdAt, new Date())) return null;
  return row.billingReviewStatus;
}
