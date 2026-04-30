// Конфигурация Auth.js (NextAuth v5): вход по email/паролю, JWT-сессия
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { addMilliseconds } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  consumeLoginRateLimit,
  LOCKOUT_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "@/lib/auth-security";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Генерация уникального slug нужна для авто-создания организации при первом Google-входе
async function uniqueOrgSlug(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const slug = Math.random().toString(36).slice(2, 10);
    const exists = await prisma.organization.findUnique({ where: { slug } });
    if (!exists) return slug;
  }
  throw new Error("slug_collision");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email и пароль",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: async (raw, req) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        // Rate limit по email снижает риск brute force даже без отдельного Redis на dev/starter-этапе
        if (!consumeLoginRateLimit(email.toLowerCase())) return null;
        // Rate limit по IP добавляет дополнительный барьер против массовых попыток входа
        const ip = req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!consumeLoginRateLimit(ip)) return null;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { organization: { select: { suspended: true } } },
        });
        if (!user) return null;
        if (user.organization?.suspended) return null;
        // Блокировка учетной записи временно останавливает новые попытки после серии ошибок
        if (user.lockoutUntil && user.lockoutUntil > new Date()) return null;
        // Не пускаем в credentials-вход без подтвержденной почты, чтобы закрыть невалидные регистрации
        if (!user.emailVerifiedAt) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          const nextAttempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? 0 : nextAttempts,
              lockoutUntil:
                nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS ? addMilliseconds(new Date(), LOCKOUT_MS) : null,
            },
          });
          return null;
        }
        // Успешный вход сбрасывает счетчик ошибок и снимает lockout, чтобы не блокировать легитимного пользователя
        if (user.failedLoginAttempts !== 0 || user.lockoutUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockoutUntil: null },
          });
        }
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
    // OAuth-провайдер Google включается только если заданы env, чтобы не ломать локальную разработку без ключей
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    // На Google-входе гарантируем наличие локального пользователя/организации, чтобы админка работала единообразно
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;
      const lower = user.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: lower } });
      if (existing) {
        if (!existing.emailVerifiedAt) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { emailVerifiedAt: new Date() },
          });
        }
        return true;
      }
      const fallbackHash = await bcrypt.hash(`${lower}:${Date.now()}`, 10);
      // Для новых OAuth-пользователей создаем базовую организацию и дефолтное расписание, как при обычной регистрации
      await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: lower,
            name: user.name ?? null,
            passwordHash: fallbackHash,
            emailVerifiedAt: new Date(),
          },
        });
        const slug = await uniqueOrgSlug();
        const org = await tx.organization.create({
          data: {
            slug,
            ownerId: created.id,
            businessName: user.name?.trim() || "Мой бизнес",
          },
        });
        await tx.weeklySlot.createMany({
          data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
            organizationId: org.id,
            dayOfWeek,
            startMinutes: 9 * 60,
            endMinutes: 18 * 60,
          })),
        });
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
          select: { id: true },
        });
        if (dbUser) token.sub = dbUser.id;
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
