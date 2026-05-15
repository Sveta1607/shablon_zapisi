// Доступ к панели платформы: секрет из .env (cookie или Bearer)
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const PLATFORM_ADMIN_COOKIE = "platform_admin_session";

export function getPlatformAdminSecret(): string | null {
  return process.env.PLATFORM_ADMIN_SECRET?.trim() || null;
}

export function isPlatformBearerAuthorized(req: Request): boolean {
  const secret = getPlatformAdminSecret();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === secret;
}

export async function isPlatformAdminSession(): Promise<boolean> {
  const secret = getPlatformAdminSecret();
  if (!secret) return false;
  const jar = await cookies();
  return jar.get(PLATFORM_ADMIN_COOKIE)?.value === secret;
}

export function isPlatformRequestAuthorized(req: Request): boolean {
  return isPlatformBearerAuthorized(req);
}

export async function isPlatformAuthorized(req: Request): Promise<boolean> {
  if (isPlatformBearerAuthorized(req)) return true;
  return isPlatformAdminSession();
}

export function platformUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
}

export function setPlatformAdminCookie(response: NextResponse, secret: string): void {
  response.cookies.set(PLATFORM_ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function clearPlatformAdminCookie(response: NextResponse): void {
  response.cookies.set(PLATFORM_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
