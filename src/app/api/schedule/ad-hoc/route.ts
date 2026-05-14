// Исключения: окна на конкретные даты. Raw SQL вместо prisma.adHocDaySlot — в dev (Turbopack) делегат модели
// иногда undefined в сформированном бандле, $queryRaw / $executeRaw остаются на корневом PrismaClient.
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { findOverlapErrorAdHoc } from "@/lib/weekly-schedule-helpers";
import { prisma } from "@/lib/prisma";

const dateYmd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const putSchema = z.object({
  slots: z
    .array(
      z.object({
        dateStr: dateYmd,
        startMinutes: z.coerce.number().int().min(0).max(24 * 60 - 1),
        endMinutes: z.coerce.number().int().min(1).max(24 * 60),
      })
    )
    .max(200),
});

type AdHocRow = {
  id: string;
  organizationId: string;
  dateStr: string;
  startMinutes: number;
  endMinutes: number;
};

export async function GET() {
  const ctx = await requireOrganization({ permission: "schedule" });
  if (!ctx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  try {
    const rows = await prisma.$queryRaw<AdHocRow[]>(Prisma.sql`
      SELECT "id", "organizationId", "dateStr", "startMinutes", "endMinutes"
      FROM "AdHocDaySlot"
      WHERE "organizationId" = ${ctx.organization.id}
      ORDER BY "dateStr" ASC, "startMinutes" ASC
    `);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("[ad-hoc GET]", e);
    const m = e instanceof Error ? e.message : String(e);
    const hint =
      /does not exist|relation|42P01/i.test(m) ? " Выполните: npx prisma migrate deploy к Supabase" : "";
    return NextResponse.json({ error: m + hint }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const ctx = await requireOrganization({ permission: "schedule" });
  if (!ctx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;
  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first
      ? `${first.path.length ? String(first.path[0]) + ": " : ""}${first.message}`
      : "Неверные данные";
    return NextResponse.json({ error: msg, details: parsed.error.flatten() }, { status: 400 });
  }
  for (const s of parsed.data.slots) {
    if (s.endMinutes <= s.startMinutes) {
      return NextResponse.json({ error: "endMinutes должен быть больше startMinutes" }, { status: 400 });
    }
  }
  const overlap = findOverlapErrorAdHoc(parsed.data.slots);
  if (overlap) {
    return NextResponse.json({ error: overlap }, { status: 400 });
  }
  const orgId = ctx.organization.id;
  const toCreate = parsed.data.slots;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`DELETE FROM "AdHocDaySlot" WHERE "organizationId" = ${orgId}`);
      for (const s of toCreate) {
        const id = randomUUID();
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "AdHocDaySlot" ("id", "organizationId", "dateStr", "startMinutes", "endMinutes")
          VALUES (${id}, ${orgId}, ${s.dateStr}, ${s.startMinutes}, ${s.endMinutes})
        `);
      }
    });
    const rows = await prisma.$queryRaw<AdHocRow[]>(Prisma.sql`
      SELECT "id", "organizationId", "dateStr", "startMinutes", "endMinutes"
      FROM "AdHocDaySlot"
      WHERE "organizationId" = ${orgId}
      ORDER BY "dateStr" ASC, "startMinutes" ASC
    `);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("[ad-hoc PUT]", e);
    const m = e instanceof Error ? e.message : String(e);
    const hint =
      /does not exist|relation|42P01/i.test(m) ? " Таблица не найдена: npx prisma migrate deploy" : "";
    return NextResponse.json({ error: m + hint }, { status: 500 });
  }
}
