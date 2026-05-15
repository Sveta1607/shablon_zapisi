// Отметить оплату услуги вручную (после перевода): только с секретом PLATFORM_ADMIN_SECRET в .env
import { NextResponse } from "next/server";
import { z } from "zod";
import { grantOrganizationAccess } from "@/lib/billing-queue";
import { isPlatformAuthorized, platformUnauthorizedResponse } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email().optional(),
  slug: z.string().min(1).max(64).optional(),
}).refine((d) => d.email || d.slug, { message: "Укажите email или slug организации" });

export async function POST(req: Request) {
  if (!(await isPlatformAuthorized(req))) {
    return platformUnauthorizedResponse();
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

  await grantOrganizationAccess(orgId);
  const updated = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true, businessName: true, servicePurchasedAt: true },
  });
  if (!updated) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    organization: {
      slug: updated.slug,
      businessName: updated.businessName,
      servicePurchasedAt: updated.servicePurchasedAt?.toISOString(),
    },
  });
}
