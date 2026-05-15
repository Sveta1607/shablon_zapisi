-- Демо 14 дней и очередь оплаты на платформе
CREATE TYPE "BillingReviewStatus" AS ENUM ('PENDING', 'DEFERRED', 'REJECTED');

ALTER TABLE "Organization" ADD COLUMN "servicePurchasedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "billingReviewStatus" "BillingReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Organization" ADD COLUMN "billingDeferredAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "billingRejectedAt" TIMESTAMP(3);
