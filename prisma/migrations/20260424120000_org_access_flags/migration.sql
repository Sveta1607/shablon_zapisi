-- Флаги доступа: suspended (платформа), publicBookingEnabled (приём онлайн-записей)
ALTER TABLE "Organization" ADD COLUMN "suspended" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Organization" ADD COLUMN "publicBookingEnabled" INTEGER NOT NULL DEFAULT 1;
