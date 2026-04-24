// Публичные данные витрины: без авторизации, только активные услуги и оформление
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      businessName: true,
      description: true,
      phone: true,
      emailContact: true,
      timezone: true,
      slotStepMinutes: true,
      accentColor: true,
      logoUrl: true,
      suspended: true,
      publicBookingEnabled: true,
      services: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          durationMinutes: true,
          priceCents: true,
        },
      },
    },
  });
  if (!org) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  // Полная блокировка арендатора: витрина как «не существует»
  if (org.suspended) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  // Онлайн-витрина выключена владельцем бизнеса — остаётся карточка, без списка услуг
  if (!org.publicBookingEnabled) {
    return NextResponse.json({ ...org, services: [] });
  }
  return NextResponse.json(org);
}
