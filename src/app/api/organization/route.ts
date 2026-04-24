// Чтение и обновление карточки организации (профиль, внешний вид, правила записи)
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  businessName: z.string().min(1).max(120).optional(),
  description: z.string().max(4000).optional(),
  phone: z.string().max(40).optional(),
  emailContact: z.string().max(120).optional(),
  timezone: z.string().min(1).max(80).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.union([z.string().url().max(500), z.literal(""), z.null()]).optional(),
  minAdvanceHours: z.number().int().min(0).max(168).optional(),
  slotStepMinutes: z.number().int().min(5).max(120).optional(),
  publicBookingEnabled: z.boolean().optional(),
});

export async function GET() {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organization.id },
    include: {
      _count: { select: { services: true, bookings: true } },
    },
  });
  return NextResponse.json(org);
}

export async function PATCH(req: Request) {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }
  const payload = { ...parsed.data };
  if (payload.logoUrl === "") payload.logoUrl = null;

  const updated = await prisma.organization.update({
    where: { id: ctx.organization.id },
    data: payload,
  });
  return NextResponse.json(updated);
}
