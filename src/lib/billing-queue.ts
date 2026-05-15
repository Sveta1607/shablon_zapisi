// Очередь организаций после демо: выборка, сортировка, действия платформы
import { addDays } from "date-fns";
import type { BillingReviewStatus } from "@prisma/client";
import { DEMO_TRIAL_DAYS } from "@/lib/org-access";
import { prisma } from "@/lib/prisma";

export type BillingQueueItem = {
  id: string;
  slug: string;
  businessName: string;
  ownerEmail: string;
  ownerName: string | null;
  createdAt: string;
  trialEndedAt: string;
  billingReviewStatus: BillingReviewStatus;
  billingDeferredAt: string | null;
  daysSinceTrialEnd: number;
};

type QueueRow = {
  id: string;
  slug: string;
  businessName: string;
  createdAt: Date;
  billingReviewStatus: BillingReviewStatus;
  billingDeferredAt: Date | null;
  ownerEmail: string;
  ownerName: string | null;
};

function trialEndedAt(createdAt: Date): Date {
  return addDays(createdAt, DEMO_TRIAL_DAYS);
}

function isDemoExpired(createdAt: Date, now: Date): boolean {
  return now >= trialEndedAt(createdAt);
}

function sortQueueItems(items: BillingQueueItem[]): BillingQueueItem[] {
  const pending = items
    .filter((i) => i.billingReviewStatus === "PENDING")
    .sort((a, b) => new Date(a.trialEndedAt).getTime() - new Date(b.trialEndedAt).getTime());
  const deferred = items
    .filter((i) => i.billingReviewStatus === "DEFERRED")
    .sort((a, b) => {
      const da = a.billingDeferredAt ? new Date(a.billingDeferredAt).getTime() : 0;
      const db = b.billingDeferredAt ? new Date(b.billingDeferredAt).getTime() : 0;
      return da - db;
    });
  return [...pending, ...deferred];
}

/** Организации с истёкшим демо без покупки, в очереди (не отклонены) */
export async function listBillingQueue(now = new Date()): Promise<BillingQueueItem[]> {
  const rows = await prisma.$queryRaw<QueueRow[]>`
    SELECT
      o."id",
      o."slug",
      o."businessName",
      o."createdAt",
      o."billingReviewStatus",
      o."billingDeferredAt",
      u."email" AS "ownerEmail",
      u."name" AS "ownerName"
    FROM "Organization" o
    INNER JOIN "User" u ON u."id" = o."ownerId"
    WHERE o."suspended" = false
      AND o."servicePurchasedAt" IS NULL
      AND o."billingReviewStatus" IN ('PENDING'::"BillingReviewStatus", 'DEFERRED'::"BillingReviewStatus")
  `;

  const items: BillingQueueItem[] = [];
  for (const row of rows) {
    if (!isDemoExpired(row.createdAt, now)) continue;
    const end = trialEndedAt(row.createdAt);
    const daysSince = Math.floor((now.getTime() - end.getTime()) / (24 * 60 * 60 * 1000));
    items.push({
      id: row.id,
      slug: row.slug,
      businessName: row.businessName,
      ownerEmail: row.ownerEmail,
      ownerName: row.ownerName,
      createdAt: row.createdAt.toISOString(),
      trialEndedAt: end.toISOString(),
      billingReviewStatus: row.billingReviewStatus,
      billingDeferredAt: row.billingDeferredAt?.toISOString() ?? null,
      daysSinceTrialEnd: daysSince,
    });
  }

  return sortQueueItems(items);
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
