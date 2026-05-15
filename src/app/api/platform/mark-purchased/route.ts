// Отметить оплату услуги вручную (после перевода): только с секретом PLATFORM_ADMIN_SECRET в .env
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email().optional(),
  slug: z.string().min(1).max(64).optional(),
}).refine((d) => d.email || d.slug, { message: "Укажите email или slug организации" });

function isAuthorized(req: Request): boolean {
  const secret = process.env.PLATFORM_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const { email, slug } = parsed.data;
  let orgId: string | null = null;

  if (slug) {
    const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
    orgId = org?.id ?? null;
  } else if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { organization: { select: { id: true } } },
    });
    orgId = user?.organization?.id ?? null;
  }

  if (!orgId) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: { servicePurchasedAt: new Date() },
    select: { slug: true, businessName: true, servicePurchasedAt: true },
  });

  return NextResponse.json({
    ok: true,
    organization: {
      slug: updated.slug,
      businessName: updated.businessName,
      servicePurchasedAt: updated.servicePurchasedAt?.toISOString(),
    },
  });
}
