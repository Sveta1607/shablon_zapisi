// Базовые заголовки безопасности для страниц входа и админки
import { NextResponse } from "next/server";

export function middleware() {
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
};
