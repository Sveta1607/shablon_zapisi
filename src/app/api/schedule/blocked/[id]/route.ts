// Удаление одной заблокированной даты
import { NextResponse } from "next/server";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await requireOrganization({ permission: "schedule" });
  if (!authCtx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(authCtx.organization);
  if (s) return s;
  const { id } = await ctx.params;
  const row = await prisma.blockedDate.findFirst({
    where: { id, organizationId: authCtx.organization.id },
  });
  if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  await prisma.blockedDate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
