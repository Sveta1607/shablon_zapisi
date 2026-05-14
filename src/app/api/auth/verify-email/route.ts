// GET: подтверждение email по одноразовому токену из письма
import { AuthTokenPurpose } from "@prisma/client";
import { NextResponse } from "next/server";
import { hashToken } from "@/lib/auth-security";
import { appBaseUrl } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("token");
  const base = appBaseUrl();

  if (!raw?.trim()) {
    return NextResponse.redirect(`${base}/login?error=verify_missing`);
  }

  const tokenHash = hashToken(raw.trim());
  const row = await prisma.authEmailToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  const invalidRedirect = NextResponse.redirect(`${base}/login?error=verify_invalid`);

  if (!row || row.purpose !== AuthTokenPurpose.VERIFY_EMAIL || row.usedAt) {
    return invalidRedirect;
  }
  if (row.expiresAt < new Date()) {
    return invalidRedirect;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.authEmailToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.authEmailToken.deleteMany({
      where: {
        userId: row.userId,
        purpose: AuthTokenPurpose.VERIFY_EMAIL,
        id: { not: row.id },
      },
    }),
  ]);

  return NextResponse.redirect(`${base}/login?notice=email-verified`);
}
