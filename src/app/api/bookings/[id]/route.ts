// Отмена или изменение статуса записи
import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { buildReservedStepStarts, reservationBlockMinutes } from "@/lib/slots";

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const authCtx = await requireOrganization({ permission: "bookings" });
  if (!authCtx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
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
    include: { service: true, organization: { select: { slotStepMinutes: true } } },
  });
  if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  // Если статус не меняется, не трогаем блокировки и просто возвращаем текущую запись
  if (row.status === parsed.data.status) {
    return NextResponse.json(row);
  }

  if (parsed.data.status === "CANCELLED") {
    // Отмена освобождает lock-строки, чтобы слот снова был доступен для записи
    const updated = await prisma.$transaction(async (tx) => {
      await tx.bookingSlotLock.deleteMany({ where: { bookingId: row.id } });
      return tx.booking.update({
        where: { id: row.id },
        data: { status: "CANCELLED" },
      });
    });
    return NextResponse.json(updated);
  }

  try {
    // Возврат в CONFIRMED снова захватывает lock-строки; конфликт даст 409
    const reservationMinutes = reservationBlockMinutes(row.service.durationMinutes);
    const stepStarts = buildReservedStepStarts(row.startsAt, reservationMinutes, row.organization.slotStepMinutes);
    const updated = await prisma.$transaction(async (tx) => {
      await tx.bookingSlotLock.createMany({
        data: stepStarts.map((slotStart) => ({
          organizationId: row.organizationId,
          bookingId: row.id,
          slotStart,
        })),
      });
      return tx.booking.update({
        where: { id: row.id },
        data: { status: "CONFIRMED", endsAt: addMinutes(row.startsAt, reservationMinutes) },
      });
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "SLOT_CONFLICT", message: "Нельзя подтвердить: это время уже занято" },
        { status: 409 }
      );
    }
    throw error;
  }
}
