// Утилиты безопасности авторизации: rate limit, lockout-константы и токены для email-процессов
import { createHash, randomBytes } from "node:crypto";

// Ограничение частоты на вход защищает от массового перебора паролей на один email/IP
const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS_PER_WINDOW = 8;
// Ограничение частоты на регистрацию снижает спам и злоупотребление endpoint'ом
const REGISTER_WINDOW_MS = 10 * 60_000;
const REGISTER_MAX_ATTEMPTS_PER_WINDOW = 6;
// Ограничение на восстановление пароля сдерживает автоматический flood почтовых ссылок
const RESET_WINDOW_MS = 10 * 60_000;
const RESET_MAX_ATTEMPTS_PER_WINDOW = 6;
// Количество ошибок до lockout: после достижения порога даем паузу на новые попытки
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
// Длительность lockout в миллисекундах после превышения лимита ошибок входа
export const LOCKOUT_MS = 15 * 60_000;

type RateBucket = { count: number; resetAt: number };

// In-memory хранилище лимитов: достаточно для dev/single-instance и не требует внешнего Redis
const rateMap = new Map<string, RateBucket>();

function consumeLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = rateMap.get(key);
  if (!prev || prev.resetAt <= now) {
    rateMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (prev.count >= max) return false;
  prev.count += 1;
  rateMap.set(key, prev);
  return true;
}

// Нормализация IP нужна, чтобы ключи лимитов были стабильными и без пустых значений
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return xff || realIp || "unknown";
}

// Лимит для endpoint'а входа (в authorize и по email, и по IP)
export function consumeLoginRateLimit(key: string): boolean {
  return consumeLimit(`login:${key}`, LOGIN_MAX_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW_MS);
}

// Лимит для регистрации по IP
export function consumeRegisterRateLimit(ip: string): boolean {
  return consumeLimit(`register:${ip}`, REGISTER_MAX_ATTEMPTS_PER_WINDOW, REGISTER_WINDOW_MS);
}

// Лимит для запросов на reset/resend по IP
export function consumeResetRateLimit(ip: string): boolean {
  return consumeLimit(`reset:${ip}`, RESET_MAX_ATTEMPTS_PER_WINDOW, RESET_WINDOW_MS);
}

// Сырый токен нужен для ссылки, а hash — для безопасного хранения в БД
export function createRawTokenAndHash(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

// Преобразование токена из URL в hash, чтобы искать токены без хранения секрета в БД
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
