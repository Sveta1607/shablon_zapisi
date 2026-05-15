#!/usr/bin/env node
/** Временно: сдвинуть createdAt организации, чтобы демо считалось истёкшим */
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] || "").toLowerCase();
if (!email) {
  console.error("Usage: node scripts/expire-demo-for-email.mjs user@example.com");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true },
  });
  if (!user?.organization) {
    console.error("Организация не найдена для", email);
    process.exit(1);
  }
  const expiredAt = new Date();
  expiredAt.setDate(expiredAt.getDate() - 20);
  const org = await prisma.organization.update({
    where: { id: user.organization.id },
    data: { createdAt: expiredAt, servicePurchasedAt: null },
    select: { slug: true, businessName: true, createdAt: true, servicePurchasedAt: true },
  });
  console.log("OK — демо истекло для", email);
  console.log(JSON.stringify(org, null, 2));
} finally {
  await prisma.$disconnect();
}
