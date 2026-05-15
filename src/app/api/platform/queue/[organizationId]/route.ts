// Действия по заявке: grant | defer | reject
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deferOrganizationReview,
  grantOrganizationAccess,
  rejectOrganizationReview,
} from "@/lib/billing-queue";
import { isPlatformAuthorized, platformUnauthorizedResponse } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  action: z.enum(["grant", "defer", "reject"]),
});

export async function POST(req: Request, ctx: { params: Promise<{ organizationId: string }> }) {
  if (!(await isPlatformAuthorized(req))) {
    return platformUnauthorizedResponse();
  }

  const { organizationId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Нужно action: grant | defer | reject" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, servicePurchasedAt: true, suspended: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }

  const { action } = parsed.data;
  if (action === "grant") {
    await grantOrganizationAccess(organizationId);
    return NextResponse.json({ ok: true, action: "grant" });
  }
  if (action === "defer") {
    await deferOrganizationReview(organizationId);
    return NextResponse.json({ ok: true, action: "defer" });
  }
  await rejectOrganizationReview(organizationId);
  return NextResponse.json({ ok: true, action: "reject" });
}
