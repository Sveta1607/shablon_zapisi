// Исключения: заблокированные даты (отпуск, праздник)
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  dateStr: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

export async function GET() {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  const rows = await prisma.blockedDate.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { dateStr: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  const row = await prisma.blockedDate.upsert({
    where: {
      organizationId_dateStr: {
        organizationId: ctx.organization.id,
        dateStr: parsed.data.dateStr,
      },
    },
    create: {
      organizationId: ctx.organization.id,
      dateStr: parsed.data.dateStr,
      reason: parsed.data.reason ?? null,
    },
    update: { reason: parsed.data.reason ?? null },
  });
  return NextResponse.json(row, { status: 201 });
}
