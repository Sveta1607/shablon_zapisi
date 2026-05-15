// Доступ к панели платформы: секрет из .env (cookie или Bearer)
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const PLATFORM_ADMIN_COOKIE = "platform_admin_session";

export function getPlatformAdminSecret(): string | null {
  return process.env.PLATFORM_ADMIN_SECRET?.trim() || null;
}

/** В cookie храним хеш, а не сам секрет */
export function getPlatformSessionCookieValue(): string | null {
  const secret = getPlatformAdminSecret();
  if (!secret) return null;
  return createHash("sha256").update(`platform-admin:v1:${secret}`).digest("hex");
}

/** Явное переопределение, если прокси (Amvera) некорректно отдаёт схему */
function envForceSecure(): boolean | null {
  const v = process.env.PLATFORM_COOKIE_SECURE?.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
}

/**
 * Флаг Secure для cookie сессии платформы.
 * На Amvera запрос к Node часто идёт по HTTP, а клиент — по HTTPS; смотрим X-Forwarded-Proto,
 * иначе при ошибочном выборе Secure cookie браузер не сохраняет и вход «успешен», но сессии нет.
 */
function useSecureCookies(req?: Request): boolean {
  const forced = envForceSecure();
  if (forced !== null) return forced;

  const authUrl = (process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (authUrl.startsWith("https://")) return true;
  if (authUrl.startsWith("http://")) return false;

  if (req) {
    const raw =
      req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
      req.headers.get("x-forwarded-protocol")?.split(",")[0]?.trim();
    if (raw === "https") return true;
    if (raw === "http") return false;
  }

  return process.env.NODE_ENV === "production";
}

export function isPlatformBearerAuthorized(req: Request): boolean {
  const expected = getPlatformAdminSecret();
  if (!expected) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  const token = auth.slice(7).trim();
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isPlatformAdminSession(): Promise<boolean> {
  const expected = getPlatformSessionCookieValue();
  if (!expected) return false;
  const jar = await cookies();
  const got = jar.get(PLATFORM_ADMIN_COOKIE)?.value;
  if (!got || got.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(got), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isPlatformAuthorized(req: Request): Promise<boolean> {
  if (isPlatformBearerAuthorized(req)) return true;
  return isPlatformAdminSession();
}

export function platformUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
}

export function setPlatformAdminCookie(response: NextResponse, req?: Request): void {
  const value = getPlatformSessionCookieValue();
  if (!value) return;
  response.cookies.set(PLATFORM_ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies(req),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearPlatformAdminCookie(response: NextResponse, req?: Request): void {
  response.cookies.set(PLATFORM_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies(req),
    path: "/",
    maxAge: 0,
  });
}
