// Удаление участника из организации (только владелец)
import { NextResponse } from "next/server";
import { rejectIfOrganizationSuspended, requireOrganizationOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const ownerCtx = await requireOrganizationOwner();
  if (!ownerCtx) return NextResponse.json({ error: "Только владелец" }, { status: 403 });
  const sus = rejectIfOrganizationSuspended(ownerCtx.organization);
  if (sus) return sus;

  const { id: memberId } = await ctx.params;
  const row = await prisma.organizationMember.findFirst({
    where: { id: memberId, organizationId: ownerCtx.organization.id },
  });
  if (!row) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
