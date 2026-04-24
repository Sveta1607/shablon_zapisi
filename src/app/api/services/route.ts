// Список услуг организации и создание новой услуги
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  durationMinutes: z.number().int().min(5).max(24 * 60),
  priceCents: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  const list = await prisma.service.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  const maxSort = await prisma.service.aggregate({
    where: { organizationId: ctx.organization.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;
  const row = await prisma.service.create({
    data: {
      organizationId: ctx.organization.id,
      name: parsed.data.name,
      durationMinutes: parsed.data.durationMinutes,
      priceCents: parsed.data.priceCents ?? null,
      active: parsed.data.active ?? true,
      sortOrder,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
