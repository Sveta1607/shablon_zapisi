// Регистрация владельца: без подтверждения email вход запрещён; письмо с ссылкой
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { issueEmailVerificationToken } from "@/lib/auth-tokens";
import { consumeRegisterRateLimit, getClientIp } from "@/lib/auth-security";
import { getPostgresDatabaseUrlValidationError, isPrismaClientInitializationError, isPrismaTransientConnectionError } from "@/lib/database-config";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
  const ip = getClientIp(req);
  if (!(await consumeRegisterRateLimit(ip))) {
    return NextResponse.json({ error: "Слишком много попыток. Повторите позже." }, { status: 429 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, name, businessName } = parsed.data;
  const lower = email.toLowerCase();

  // Явная проверка строки БД — иначе Prisma даёт 500 без понятного текста для пользователя
  const dbUrlIssue = getPostgresDatabaseUrlValidationError();
  if (dbUrlIssue) {
    return NextResponse.json({ error: dbUrlIssue, code: "database_configuration" }, { status: 503 });
  }

  let user;
  let slug = "";
  try {
    // Сначала проверяем email: неподтверждённый аккаунт — повторная отправка письма при совпадении пароля
    const taken = await prisma.user.findUnique({ where: { email: lower } });
    if (taken) {
      if (!taken.emailVerifiedAt) {
        const samePassword = await bcrypt.compare(password, taken.passwordHash);
        if (!samePassword) {
          return NextResponse.json(
            {
              error:
                "Этот email уже указан, но почта не подтверждена. Чтобы получить письмо ещё раз, введите тот же пароль, что при первой регистрации.",
            },
            { status: 403 }
          );
        }
        try {
          await issueEmailVerificationToken(taken.id, taken.email);
        } catch (e) {
          console.error("[register] resend verification email failed", e);
          return NextResponse.json(
            {
              error: "Не удалось отправить письмо. Проверьте SMTP в .env.",
              needsVerification: true,
              email: taken.email,
            },
            { status: 503 }
          );
        }
        return NextResponse.json({
          ok: true,
          needsEmailVerification: true,
          email: taken.email,
          resent: true,
        });
      }
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const defaultDays = [0, 1, 2, 3, 4, 5, 6];
    const startMinutes = 9 * 60;
    const endMinutes = 18 * 60;

    slug = await uniqueSlug();

    user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email: lower,
          passwordHash,
          name: name ?? null,
          emailVerifiedAt: null,
        },
      });
      const org = await tx.organization.create({
        data: {
          slug,
          ownerId: u.id,
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
      return u;
    });
  } catch (e) {
    if (isPrismaClientInitializationError(e)) {
      console.error("[register] Prisma init", e);
      return NextResponse.json(
        {
          error:
            "Не удалось подключиться к базе данных. Проверьте DATABASE_URL и что сервер PostgreSQL запущен, затем перезапустите приложение.",
          code: "database_configuration",
        },
        { status: 503 }
      );
    }
    if (isPrismaTransientConnectionError(e)) {
      console.error("[register] DB pool / connection", e);
      return NextResponse.json(
        {
          error:
            "База данных временно недоступна или разорвало соединение (часто сеть или лимит соединений у хостинга). Повторите регистрацию через минуту.",
          code: "database_temporarily_unavailable",
        },
        { status: 503 }
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 409 });
    }
    throw e;
  }

  try {
    await issueEmailVerificationToken(user.id, user.email);
  } catch (e) {
    console.error("[register] email send failed", e);
    return NextResponse.json(
      {
        error:
          "Аккаунт создан, но письмо не отправлено. Проверьте SMTP в .env или запросите повтор на странице входа.",
        needsVerification: true,
        email: user.email,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, slug, needsEmailVerification: true, email: user.email });
}
