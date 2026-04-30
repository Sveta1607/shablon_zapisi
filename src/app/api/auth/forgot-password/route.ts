// Запрос на сброс пароля: создаем одноразовый токен и отправляем ссылку на reset-страницу
import { addHours } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import { sendAuthActionLink } from "@/lib/auth-mail";
import { consumeResetRateLimit, createRawTokenAndHash, getClientIp } from "@/lib/auth-security";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  // Лимит запросов на reset сдерживает автоматический спам и перебор email
  const ip = getClientIp(req);
  if (!(await consumeResetRateLimit(ip))) {
    return NextResponse.json({ error: "Слишком много попыток. Повторите позже." }, { status: 429 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  // Унифицированный ответ не раскрывает, зарегистрирован ли конкретный email
  if (!user) return NextResponse.json({ ok: true });

  const { rawToken, tokenHash } = createRawTokenAndHash();
  await prisma.$transaction(async (tx) => {
    // Закрываем старые активные reset-токены, чтобы сохранять одноразовость флоу
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addHours(new Date(), 2),
      },
    });
  });
  await sendAuthActionLink({ to: email, kind: "reset-password", token: rawToken });
  return NextResponse.json({ ok: true });
}
