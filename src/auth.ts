// NextAuth v5: JWT-сессия, вход по email/паролю и опционально Google OAuth
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { addMilliseconds } from "date-fns";
import { z } from "zod";
import {
  consumeLoginRateLimit,
  LOCKOUT_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
} from "@/lib/auth-security";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

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
        if (!(await consumeLoginRateLimit(email.toLowerCase()))) return null;
        const ip = req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!(await consumeLoginRateLimit(ip))) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { organization: { select: { suspended: true } } },
        });
        if (!user) return null;
        if (user.organization?.suspended) return null;
        if (user.lockoutUntil && user.lockoutUntil > new Date()) return null;

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

        if (user.failedLoginAttempts !== 0 || user.lockoutUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedLoginAttempts: 0, lockoutUntil: null },
          });
        }

        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
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
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) return true;
      const lower = user.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: lower } });
      if (existing) return true;

      const fallbackHash = await bcrypt.hash(`${lower}:${Date.now()}`, 10);
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
    async jwt({ token, user, account }) {
      if (user?.email && account?.provider === "google") {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (dbUser) {
          token.sub = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name ?? user.name;
        }
      } else if (user?.id) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
        if (user.name !== undefined) token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
