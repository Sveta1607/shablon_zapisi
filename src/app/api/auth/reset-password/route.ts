// Подтверждение сброса: проверяем токен и задаем новый пароль пользователя
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hashToken } from "@/lib/auth-security";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Минимум 8 символов"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  const tokenHash = hashToken(parsed.data.token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  // Проверяем валидность токена до смены пароля, чтобы не принимать просроченные/использованные ссылки
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Ссылка сброса недействительна или устарела." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  // Атомарно меняем пароль, снимаем lockout и гасим все reset-токены пользователя
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });
  return NextResponse.json({ ok: true });
}
