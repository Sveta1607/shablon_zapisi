// Безопасность auth: rate limit входа/регистрации и константы блокировки после ошибок пароля
import { createHash, randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";

const LOGIN_WINDOW_MS = 60_000;
const LOGIN_MAX_ATTEMPTS_PER_WINDOW = 8;
const REGISTER_WINDOW_MS = 10 * 60_000;
const REGISTER_MAX_ATTEMPTS_PER_WINDOW = 6;

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60_000;

type RateBucket = { count: number; resetAt: number };

const rateMap = new Map<string, RateBucket>();

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

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

async function consumeLimitRedis(key: string, max: number, windowMs: number): Promise<boolean> {
  if (!redis) return consumeLimit(key, max, windowMs);
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.pexpire(key, windowMs);
  }
  return current <= max;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return xff || realIp || "unknown";
}

export async function consumeLoginRateLimit(key: string): Promise<boolean> {
  return consumeLimitRedis(`login:${key}`, LOGIN_MAX_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW_MS);
}

export async function consumeRegisterRateLimit(ip: string): Promise<boolean> {
  return consumeLimitRedis(`register:${ip}`, REGISTER_MAX_ATTEMPTS_PER_WINDOW, REGISTER_WINDOW_MS);
}

export function createRawTokenAndHash(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
