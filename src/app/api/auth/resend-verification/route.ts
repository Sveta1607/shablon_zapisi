// Перевыпуск ссылки подтверждения email для незавершенной регистрации
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
  // Лимит на endpoint нужен, чтобы не дать заспамить повторной отправкой писем
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
  // Возвращаем единый успешный ответ, чтобы не раскрывать, существует ли email в системе
  if (!user || user.emailVerifiedAt) {
    return NextResponse.json({ ok: true });
  }

  const { rawToken, tokenHash } = createRawTokenAndHash();
  await prisma.$transaction(async (tx) => {
    // Старые неиспользованные токены гасим перед выпуском нового для предсказуемого UX
    await tx.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addHours(new Date(), 24),
      },
    });
  });
  await sendAuthActionLink({ to: email, kind: "verify-email", token: rawToken });
  return NextResponse.json({ ok: true });
}
