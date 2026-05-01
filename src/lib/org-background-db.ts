// Чтение колонок фона витрины прямым SQL — запасной путь, если findUnique не отдаёт нужные поля
import { prisma } from "@/lib/prisma";

export type OrgBackgroundRow = { pageBackgroundColor: string; pageBackgroundImageUrl: string | null };

export async function readOrgBackgroundFromDb(orgId: string): Promise<OrgBackgroundRow | null> {
  try {
    const rows = await prisma.$queryRaw<OrgBackgroundRow[]>`
      SELECT "pageBackgroundColor", "pageBackgroundImageUrl" FROM "Organization" WHERE "id" = ${orgId} LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export function mergeOrgWithBackground<T extends { id: string }>(
  row: T,
  bg: OrgBackgroundRow | null
): T & Partial<OrgBackgroundRow> {
  if (!bg) {
    return row;
  }
  return { ...row, pageBackgroundColor: bg.pageBackgroundColor, pageBackgroundImageUrl: bg.pageBackgroundImageUrl };
}

export function applyVitrineBackground<T extends { id: string }>(
  row: T,
  bg: OrgBackgroundRow | null
): T & { pageBackgroundColor: string; pageBackgroundImageUrl: string | null } {
  if (bg) {
    return { ...row, pageBackgroundColor: bg.pageBackgroundColor, pageBackgroundImageUrl: bg.pageBackgroundImageUrl };
  }
  return { ...row, pageBackgroundColor: "#f5f5f4", pageBackgroundImageUrl: null };
}
