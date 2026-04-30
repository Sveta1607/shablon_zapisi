// Регистрация владельца: пользователь + организация со slug + расписание по умолчанию (вся неделя 9–18, включая сб и вс)
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { addHours } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendAuthActionLink } from "@/lib/auth-mail";
import { consumeRegisterRateLimit, createRawTokenAndHash, getClientIp } from "@/lib/auth-security";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Минимум 8 символов"),
  name: z.string().min(1).max(80).optional(),
  businessName: z.string().min(1).max(120),
});

async function uniqueSlug(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = Math.random().toString(36).slice(2, 10);
    const exists = await prisma.organization.findUnique({ where: { slug } });
    if (!exists) return slug;
  }
  throw new Error("slug_collision");
}

export async function POST(req: Request) {
  // Rate limit регистрации ограничивает массовые автоматические попытки с одного IP
  const ip = getClientIp(req);
  if (!consumeRegisterRateLimit(ip)) {
    return NextResponse.json({ error: "Слишком много попыток. Повторите позже." }, { status: 429 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, name, businessName } = parsed.data;
  const lower = email.toLowerCase();
  const taken = await prisma.user.findUnique({ where: { email: lower } });
  if (taken) {
    return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const slug = await uniqueSlug();
  // dayOfWeek как в JS: 0 — вс, 1 — пн, … 6 — сб; запись на все 7 дней
  const defaultDays = [0, 1, 2, 3, 4, 5, 6];
  const startMinutes = 9 * 60;
  const endMinutes = 18 * 60;

  const { rawToken, tokenHash } = createRawTokenAndHash();
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: lower, passwordHash, name: name ?? null },
    });
    // Токен подтверждения email создается сразу при регистрации, чтобы вход был доступен только после верификации
    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: addHours(new Date(), 24),
      },
    });
    const org = await tx.organization.create({
      data: {
        slug,
        ownerId: user.id,
        businessName,
      },
    });
    await tx.weeklySlot.createMany({
      data: defaultDays.map((dayOfWeek) => ({
        organizationId: org.id,
        dayOfWeek,
        startMinutes,
        endMinutes,
      })),
    });
  });
  // Отправка ссылки завершает процесс регистрации и переводит пользователя в подтвержденный статус после клика
  await sendAuthActionLink({ to: lower, kind: "verify-email", token: rawToken });

  return NextResponse.json({ ok: true, slug, requiresEmailVerification: true });
}
