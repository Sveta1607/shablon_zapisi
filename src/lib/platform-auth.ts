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

/** Secure только по HTTPS (AUTH_URL), иначе на http://localhost cookie не ставится */
function useSecureCookies(): boolean {
  const authUrl = process.env.AUTH_URL?.trim() ?? "";
  if (authUrl.startsWith("https://")) return true;
  if (authUrl.startsWith("http://")) return false;
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

export function setPlatformAdminCookie(response: NextResponse): void {
  const value = getPlatformSessionCookieValue();
  if (!value) return;
  response.cookies.set(PLATFORM_ADMIN_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies(),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearPlatformAdminCookie(response: NextResponse): void {
  response.cookies.set(PLATFORM_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: useSecureCookies(),
    path: "/",
    maxAge: 0,
  });
}
