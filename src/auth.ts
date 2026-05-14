// NextAuth v5: только credentials, JWT с проверкой sessionVersion, без OAuth
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { addMilliseconds } from "date-fns";
import { z } from "zod";
import { DatabaseConfigurationError, EmailNotVerifiedError } from "@/lib/auth-errors";
import { writeAuditLog } from "@/lib/audit";
import { getPostgresDatabaseUrlValidationError, isPrismaClientInitializationError } from "@/lib/database-config";
import {
  consumeLoginRateLimit,
  getClientIpFromUnknown,
  LOCKOUT_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "@/lib/auth-security";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
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
        const ip = getClientIpFromUnknown(req);
        if (!(await consumeLoginRateLimit(email.toLowerCase()))) return null;
        if (!(await consumeLoginRateLimit(`ip:${ip}`))) return null;

        // Ранний отказ с понятным кодом ошибки, если строка БД не PostgreSQL — иначе Prisma падает и выглядит как неверный пароль
        const dbUrlIssue = getPostgresDatabaseUrlValidationError();
        if (dbUrlIssue) {
          console.error("[auth] authorize:", dbUrlIssue);
          throw new DatabaseConfigurationError();
        }

        try {
          const emailNorm = email.toLowerCase();
          let user = await prisma.user.findUnique({
            where: { email: emailNorm },
          });
          if (!user) {
            await writeAuditLog({ action: "login_failed_user_missing", ip });
            return null;
          }

          const orgAsOwner = await prisma.organization.findUnique({
            where: { ownerId: user.id },
            select: { suspended: true },
          });
          const membership = await prisma.organizationMember.findFirst({
            where: { userId: user.id },
            include: { organization: { select: { suspended: true } } },
          });
          const suspended =
            orgAsOwner?.suspended === true || membership?.organization?.suspended === true;
          if (suspended) return null;
          if (user.lockoutUntil && user.lockoutUntil > new Date()) return null;

          // После перехода по ссылке из письма запись на мастере уже есть, а чтение может попасть на отстающую реплику — один повторный запрос
          if (!user.emailVerifiedAt) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 450);
            });
            const refreshed = await prisma.user.findUnique({
              where: { email: emailNorm },
              select: { emailVerifiedAt: true },
            });
            if (refreshed?.emailVerifiedAt) {
              user = { ...user, emailVerifiedAt: refreshed.emailVerifiedAt };
            }
          }

          if (!user.emailVerifiedAt) {
            await writeAuditLog({ userId: user.id, action: "login_blocked_unverified", ip });
            throw new EmailNotVerifiedError();
          }

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
            await writeAuditLog({ userId: user.id, action: "login_failed_password", ip });
            return null;
          }

          if (user.failedLoginAttempts !== 0 || user.lockoutUntil) {
            await prisma.user.update({
              where: { id: user.id },
              data: { failedLoginAttempts: 0, lockoutUntil: null },
            });
          }

          await writeAuditLog({ userId: user.id, action: "login_success", ip });

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            sessionVersion: user.sessionVersion,
          };
        } catch (e) {
          if (e instanceof EmailNotVerifiedError) throw e;
          if (isPrismaClientInitializationError(e)) {
            console.error("[auth] authorize Prisma init", e);
            throw new DatabaseConfigurationError();
          }
          throw e;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name !== undefined) token.name = user.name;
        token.sessionVersion =
          "sessionVersion" in user && typeof (user as { sessionVersion?: number }).sessionVersion === "number"
            ? (user as { sessionVersion: number }).sessionVersion
            : undefined;
      }

      if (token.sub) {
        // При недоступной БД не роняем весь callback сессии — сбрасываем sub, чтобы не было JWTSessionError на каждый запрос
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub as string },
            select: { sessionVersion: true },
          });
          if (!dbUser) {
            delete token.sub;
            return token;
          }
          if (token.sessionVersion !== undefined && dbUser.sessionVersion !== token.sessionVersion) {
            delete token.sub;
            delete token.sessionVersion;
            return token;
          }
          token.sessionVersion = dbUser.sessionVersion;
        } catch (e) {
          if (isPrismaClientInitializationError(e)) {
            console.error("[auth] jwt Prisma init", e);
            delete token.sub;
            delete token.sessionVersion;
            return token;
          }
          throw e;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.sub) {
        return { ...session, user: undefined as unknown as typeof session.user };
      }
      if (session.user) {
        session.user.id = token.sub as string;
        if (token.email) session.user.email = token.email as string;
        if (token.name !== undefined) session.user.name = token.name as string;
      }
      return session;
    },
  },
});
