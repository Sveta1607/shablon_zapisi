// Обновление и удаление одной услуги по id
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  durationMinutes: z.number().int().min(5).max(24 * 60).optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await requireOrganization({ permission: "services" });
  if (!authCtx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const s0 = rejectIfOrganizationSuspended(authCtx.organization);
  if (s0) return s0;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  const existing = await prisma.service.findFirst({
    where: { id, organizationId: authCtx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const updated = await prisma.service.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await requireOrganization({ permission: "services" });
  if (!authCtx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const s1 = rejectIfOrganizationSuspended(authCtx.organization);
  if (s1) return s1;
  const { id } = await ctx.params;
  const existing = await prisma.service.findFirst({
    where: { id, organizationId: authCtx.organization.id },
  });
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
