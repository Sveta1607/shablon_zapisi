-- Демо 14 дней и очередь оплаты (идемпотентно: на Amvera поля могли уже быть от db push)
DO $$ BEGIN
  CREATE TYPE "BillingReviewStatus" AS ENUM ('PENDING', 'DEFERRED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "servicePurchasedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingDeferredAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "billingRejectedAt" TIMESTAMP(3);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Organization'
      AND column_name = 'billingReviewStatus'
  ) THEN
    ALTER TABLE "Organization"
      ADD COLUMN "billingReviewStatus" "BillingReviewStatus" NOT NULL DEFAULT 'PENDING';
  END IF;
END $$;
