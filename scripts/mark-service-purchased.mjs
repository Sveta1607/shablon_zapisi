#!/usr/bin/env node
/**
 * Отметить покупку услуги для организации (после оплаты мастером).
 * Использование:
 *   node scripts/mark-service-purchased.mjs --email master@example.com
 *   node scripts/mark-service-purchased.mjs --slug abc12def
 *
 * Нужны DATABASE_URL в .env и (опционально) вызов API:
 *   curl -X POST http://localhost:3002/api/platform/mark-purchased \
 *     -H "Authorization: Bearer $PLATFORM_ADMIN_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"email":"master@example.com"}'
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const email = arg("--email");
const slug = arg("--slug");

if (!email && !slug) {
  console.error("Укажите --email или --slug");
  process.exit(1);
}

try {
  let org = null;
  if (slug) {
    org = await prisma.organization.findUnique({ where: { slug } });
  } else {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { organization: true },
    });
    org = user?.organization ?? null;
  }

  if (!org) {
    console.error("Организация не найдена");
    process.exit(1);
  }

  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { servicePurchasedAt: new Date() },
  });

  console.log("OK:", updated.slug, updated.businessName, updated.servicePurchasedAt?.toISOString());
} finally {
  await prisma.$disconnect();
}
