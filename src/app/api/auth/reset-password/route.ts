// POST: установка нового пароля по токену из письма; инвалидация сессий через sessionVersion
import { AuthTokenPurpose } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getClientIp, hashToken } from "@/lib/auth-security";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8, "Минимум 8 символов"),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }
  const { token: rawToken, password } = parsed.data;
  const tokenHash = hashToken(rawToken.trim());

  const row = await prisma.authEmailToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !row ||
    row.purpose !== AuthTokenPurpose.PASSWORD_RESET ||
    row.usedAt ||
    row.expiresAt < new Date()
  ) {
    return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    }),
    prisma.authEmailToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    prisma.authEmailToken.deleteMany({
      where: {
        userId: row.userId,
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        id: { not: row.id },
      },
    }),
  ]);

  await writeAuditLog({ userId: row.userId, action: "password_reset_completed", ip });

  return NextResponse.json({ ok: true });
}
