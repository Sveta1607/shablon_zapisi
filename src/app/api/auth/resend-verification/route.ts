// POST: повторная отправка письма подтверждения (до входа)
import { NextResponse } from "next/server";
import { z } from "zod";
import { issueEmailVerificationToken } from "@/lib/auth-tokens";
import { consumeEmailActionRateLimit, getClientIp } from "@/lib/auth-security";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  if (!(await consumeEmailActionRateLimit(`resend:${email}`))) {
    return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
  }
  if (!(await consumeEmailActionRateLimit(`resendIp:${ip}`))) {
    return NextResponse.json({ error: "Слишком много запросов с этого адреса." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }
  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true });
  }

  try {
    await issueEmailVerificationToken(user.id, user.email);
  } catch (e) {
    console.error("[resend-verification]", e);
    return NextResponse.json({ error: "Не удалось отправить письмо. Проверьте настройку почты." }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
