-- Схема под NextAuth + Prisma + PostgreSQL (без Supabase Auth)
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockoutUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "emailContact" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "accentColor" TEXT NOT NULL DEFAULT '#0d9488',
    "pageBackgroundColor" TEXT NOT NULL DEFAULT '#f5f5f4',
    "pageBackgroundImageUrl" TEXT,
    "logoUrl" TEXT,
    "minAdvanceHours" INTEGER NOT NULL DEFAULT 2,
    "slotStepMinutes" INTEGER NOT NULL DEFAULT 30,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "publicBookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "priceCents" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklySlot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,

    CONSTRAINT "WeeklySlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdHocDaySlot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dateStr" TEXT NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,

    CONSTRAINT "AdHocDaySlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dateStr" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "notes" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingSlotLock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "slotStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingSlotLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE UNIQUE INDEX "Organization_ownerId_key" ON "Organization"("ownerId");

CREATE INDEX "AdHocDaySlot_organizationId_dateStr_idx" ON "AdHocDaySlot"("organizationId", "dateStr");

CREATE UNIQUE INDEX "BlockedDate_organizationId_dateStr_key" ON "BlockedDate"("organizationId", "dateStr");

CREATE UNIQUE INDEX "Booking_organizationId_idempotencyKey_key" ON "Booking"("organizationId", "idempotencyKey");

CREATE INDEX "BookingSlotLock_bookingId_idx" ON "BookingSlotLock"("bookingId");

CREATE UNIQUE INDEX "BookingSlotLock_organizationId_slotStart_key" ON "BookingSlotLock"("organizationId", "slotStart");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WeeklySlot" ADD CONSTRAINT "WeeklySlot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdHocDaySlot" ADD CONSTRAINT "AdHocDaySlot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingSlotLock" ADD CONSTRAINT "BookingSlotLock_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingSlotLock" ADD CONSTRAINT "BookingSlotLock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
