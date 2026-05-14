// Список записей владельца с фильтром по интервалу дат
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const ctx = await requireOrganization({ permission: "bookings" });
  if (!ctx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const r = rejectIfOrganizationSuspended(ctx.organization);
  if (r) return r;
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверный query" }, { status: 400 });
  }
  const { from, to } = parsed.data;
  const rows = await prisma.booking.findMany({
    where: {
      organizationId: ctx.organization.id,
      ...(from || to
        ? {
            startsAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { service: true },
    orderBy: { startsAt: "asc" },
    take: 500,
  });
  return NextResponse.json(rows);
}
