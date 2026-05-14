// POST: запрос ссылки сброса пароля (единый ответ, чтобы не светить наличие email)
import { NextResponse } from "next/server";
import { z } from "zod";
import { issuePasswordResetToken } from "@/lib/auth-tokens";
import { consumeEmailActionRateLimit, getClientIp } from "@/lib/auth-security";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const email = parsed.data.email.toLowerCase();

  if (!(await consumeEmailActionRateLimit(`forgot:${email}`))) {
    return NextResponse.json({ ok: true });
  }
  if (!(await consumeEmailActionRateLimit(`forgotIp:${ip}`))) {
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.emailVerifiedAt) {
    return NextResponse.json({ ok: true });
  }

  try {
    await issuePasswordResetToken(user.id, user.email);
    await writeAuditLog({ userId: user.id, action: "password_reset_requested", ip });
  } catch (e) {
    console.error("[forgot-password]", e);
  }

  return NextResponse.json({ ok: true });
}
