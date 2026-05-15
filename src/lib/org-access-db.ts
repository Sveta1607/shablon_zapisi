// Дата покупки услуги через SQL — работает до npx prisma generate (как фон витрины)
import { prisma } from "@/lib/prisma";
import type { OrgAccessRecord } from "@/lib/org-access";

export async function readOrgServicePurchasedAt(orgId: string): Promise<Date | null> {
  try {
    const rows = await prisma.$queryRaw<{ servicePurchasedAt: Date | null }[]>`
      SELECT "servicePurchasedAt" FROM "Organization" WHERE "id" = ${orgId} LIMIT 1
    `;
    return rows[0]?.servicePurchasedAt ?? null;
  } catch {
    return null;
  }
}

/** Поля доступа для проверки демо / покупки без select по новой колонке в Prisma */
export async function getOrganizationAccessRecord(org: {
  id: string;
  suspended: boolean;
  createdAt: Date;
}): Promise<OrgAccessRecord> {
  const servicePurchasedAt = await readOrgServicePurchasedAt(org.id);
  return { suspended: org.suspended, createdAt: org.createdAt, servicePurchasedAt };
}
