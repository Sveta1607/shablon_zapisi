// Чтение колонок фона витрины из SQLite: при «битом» prisma generate findUnique не возвращает pageBackground*
import { prisma } from "@/lib/prisma";

export type OrgBackgroundRow = { pageBackgroundColor: string; pageBackgroundImageUrl: string | null };

/** Прямой SELECT: работает даже если @prisma/client сгенерирован без этих полей в DMMF */
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

/** Подмешиваем фон в объект org из findUnique, чтобы JSON для админки и публичного API был полным */
export function mergeOrgWithBackground<T extends { id: string }>(
  row: T,
  bg: OrgBackgroundRow | null
): T & Partial<OrgBackgroundRow> {
  if (!bg) {
    return row;
  }
  return { ...row, pageBackgroundColor: bg.pageBackgroundColor, pageBackgroundImageUrl: bg.pageBackgroundImageUrl };
}

/**
 * Публичная витрина: фон из SQLite обязан попасть в JSON, даже если в Prisma select полей нет.
 * Без колонок в БД (bg === null) — цвет/картинка по умолчанию.
 */
export function applyVitrineBackground<T extends { id: string }>(
  row: T,
  bg: OrgBackgroundRow | null
): T & { pageBackgroundColor: string; pageBackgroundImageUrl: string | null } {
  if (bg) {
    return { ...row, pageBackgroundColor: bg.pageBackgroundColor, pageBackgroundImageUrl: bg.pageBackgroundImageUrl };
  }
  return { ...row, pageBackgroundColor: "#f5f5f4", pageBackgroundImageUrl: null };
}
