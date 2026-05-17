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

/** Приоритет в списке: сначала очередь после демо, затем активное демо, оплаченные и прочие */
function sortPlatformOrganizations(items: PlatformOrganizationItem[]): PlatformOrganizationItem[] {
  const rank = (item: PlatformOrganizationItem): number => {
    if (item.accessPhase === "suspended") return 50;
    if (item.accessPhase === "purchased") return 40;
    if (item.accessPhase === "demo_expired") {
      if (item.billingReviewStatus === "REJECTED") return 45;
      if (item.billingReviewStatus === "PENDING") return 0;
      return 10;
    }
    if (item.accessPhase === "trial") return 20;
    return 60;
  };

  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;

    if (ra === 0) {
      return new Date(a.trialEndsAt).getTime() - new Date(b.trialEndsAt).getTime();
    }
    if (ra === 10) {
      const da = a.billingDeferredAt ? new Date(a.billingDeferredAt).getTime() : 0;
      const db = b.billingDeferredAt ? new Date(b.billingDeferredAt).getTime() : 0;
      return da - db;
    }
    if (ra === 20) {
      return a.demoDaysRemaining - b.demoDaysRemaining;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

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
