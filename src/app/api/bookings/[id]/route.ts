// Отмена или изменение статуса записи
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await requireOrganization();
  if (!authCtx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(authCtx.organization);
  if (s) return s;
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
  }
  const row = await prisma.booking.findFirst({
    where: { id, organizationId: authCtx.organization.id },
  });
  if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const updated = await prisma.booking.update({
    where: { id },
    data: { status: parsed.data.status },
  });
  return NextResponse.json(updated);
}
