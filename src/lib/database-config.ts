// Проверка DATABASE_URL до запросов Prisma — иначе Prisma падает с неочевидной ошибкой, а UI показывает «неверный пароль»
import { Prisma } from "@prisma/client";

const POSTGRES_PREFIXES = ["postgresql://", "postgres://"] as const;

/** true, если строка похожа на URL PostgreSQL, который ожидает Prisma в schema.prisma */
export function isPostgresDatabaseUrl(url: string): boolean {
  const u = url.trim();
  return POSTGRES_PREFIXES.some((p) => u.startsWith(p));
}

/**
 * Возвращает текст ошибки для ответа API/логов, если подключение к PostgreSQL
 * сконфигурировано неверно (частая причина 500 при регистрации и ложного «неверный пароль»).
 */
export function getPostgresDatabaseUrlValidationError(): string | null {
  const raw = process.env.DATABASE_URL;
  if (raw === undefined || String(raw).trim() === "") {
    return "В переменных окружения не задан DATABASE_URL. Добавьте в .env строку вида postgresql://USER:PASSWORD@HOST:5432/DBNAME и перезапустите сервер.";
  }
  if (!isPostgresDatabaseUrl(String(raw))) {
    return "DATABASE_URL должен начинаться с postgresql:// или postgres:// (в проекте используется только PostgreSQL через Prisma). Исправьте .env и перезапустите сервер.";
  }
  return null;
}

/** Ошибка инициализации Prisma (неверный URL, недоступный хост и т.п.) — без жёсткой зависимости от класса из runtime */
export function isPrismaClientInitializationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: unknown }).name === "PrismaClientInitializationError"
  );
}

/**
 * Prisma: таймаут пула / обрыв TCP к удалённой БД (часто Amvera, сеть) — не 500, а повторяемая 503.
 */
export function isPrismaTransientConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P2024", "P1017", "P1001", "P1002"].includes(error.code);
  }
  return false;
}

/**
 * Дополняет DATABASE_URL таймаутами и лимитом пула — снижает P2024 при нестабильном хосте и горячей перезагрузке Next.
 */
export function buildPrismaDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "30");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "30");
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "3");
    return u.toString();
  } catch {
    return raw;
  }
}
