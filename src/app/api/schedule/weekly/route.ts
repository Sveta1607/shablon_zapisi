// Недельное расписание: целиком заменяем набор окон, без пересечений в один день
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { findOverlapError } from "@/lib/weekly-schedule-helpers";
import { prisma } from "@/lib/prisma";

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinutes: z.number().int().min(0).max(24 * 60 - 1),
  endMinutes: z.number().int().min(1).max(24 * 60),
});

const putSchema = z.object({
  slots: z.array(slotSchema).max(200),
});

export async function GET() {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  const slots = await prisma.weeklySlot.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
  });
  return NextResponse.json(slots);
}

export async function PUT(req: Request) {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;
  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  for (const s of parsed.data.slots) {
    if (s.endMinutes <= s.startMinutes) {
      return NextResponse.json({ error: "endMinutes должен быть больше startMinutes" }, { status: 400 });
    }
  }
  const overlap = findOverlapError(parsed.data.slots);
  if (overlap) {
    return NextResponse.json({ error: overlap }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.weeklySlot.deleteMany({ where: { organizationId: ctx.organization.id } }),
    prisma.weeklySlot.createMany({
      data: parsed.data.slots.map((s) => ({
        organizationId: ctx.organization.id,
        dayOfWeek: s.dayOfWeek,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
      })),
    }),
  ]);
  const slots = await prisma.weeklySlot.findMany({
    where: { organizationId: ctx.organization.id },
    orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
  });
  return NextResponse.json(slots);
}
