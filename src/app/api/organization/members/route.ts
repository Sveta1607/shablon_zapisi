// Список команды и приглашение зарегистрированного пользователя (только владелец)
import { OrgRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization, requireOrganizationOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgRole),
});

/** Состав команды: владелец и админ читают; сотруднику не отдаём список */
export async function GET() {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  if (ctx.role === "STAFF") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: ctx.organization.ownerId },
    select: { id: true, email: true, name: true },
  });
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.organization.id },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    owner,
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user,
      createdAt: m.createdAt.toISOString(),
    })),
    /** Роль текущего пользователя для UI (OWNER / ADMIN / STAFF) */
    currentRole: ctx.role,
  });
}

/** Добавить участника по email (пользователь уже должен быть зарегистрирован в приложении) */
export async function POST(req: Request) {
  const ctx = await requireOrganizationOwner();
  if (!ctx) return NextResponse.json({ error: "Только владелец может добавлять участников" }, { status: 403 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Неверные данные", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) {
    return NextResponse.json(
      { error: "Пользователь с таким email не найден. Сначала пусть зарегистрируется." },
      { status: 404 }
    );
  }
  if (target.id === ctx.organization.ownerId) {
    return NextResponse.json({ error: "Это владелец организации" }, { status: 400 });
  }

  const ownOrg = await prisma.organization.findUnique({ where: { ownerId: target.id } });
  if (ownOrg && ownOrg.id !== ctx.organization.id) {
    return NextResponse.json({ error: "Пользователь уже ведёт свою организацию" }, { status: 409 });
  }

  const existing = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: ctx.organization.id, userId: target.id },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Уже в команде" }, { status: 409 });
  }

  const created = await prisma.organizationMember.create({
    data: {
      organizationId: ctx.organization.id,
      userId: target.id,
      role: parsed.data.role,
    },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}
