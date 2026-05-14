// Исключения: заблокированные даты (отпуск, праздник) — по одной или списком
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const postSingleSchema = z.object({
  dateStr: dateYmd,
  reason: z.string().max(200).optional(),
});

const postBatchSchema = z.object({
  dates: z.array(dateYmd).min(1).max(400),
  reason: z.string().max(200).optional(),
});

const postSchema = z.union([postSingleSchema, postBatchSchema]);

export async function GET() {
  const ctx = await requireOrganization({ permission: "schedule" });
  if (!ctx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  const rows = await prisma.blockedDate.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: { dateStr: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const ctx = await requireOrganization({ permission: "schedule" });
  if (!ctx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = ctx.organization.id;
  const reason = parsed.data.reason ?? null;

  if ("dates" in parsed.data) {
    // Несколько дат за один запрос: дедупликация и upsert в транзакции
    const uniqueSorted = [...new Set(parsed.data.dates)].sort();
    const rows = await prisma.$transaction(
      uniqueSorted.map((dateStr) =>
        prisma.blockedDate.upsert({
          where: {
            organizationId_dateStr: { organizationId: orgId, dateStr },
          },
          create: { organizationId: orgId, dateStr, reason },
          update: { reason },
        })
      )
    );
    return NextResponse.json(rows, { status: 201 });
  }

  const row = await prisma.blockedDate.upsert({
    where: {
      organizationId_dateStr: {
        organizationId: orgId,
        dateStr: parsed.data.dateStr,
      },
    },
    create: {
      organizationId: orgId,
      dateStr: parsed.data.dateStr,
      reason,
    },
    update: { reason },
  });
  return NextResponse.json(row, { status: 201 });
}
