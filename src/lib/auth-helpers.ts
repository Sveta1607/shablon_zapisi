// Загрузка организации владельца по id пользователя из сессии; проверка suspended при запросах к API
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function requireSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return { session, userId };
}

export async function requireOrganization() {
  const got = await requireSessionUser();
  if (!got) return null;
  const org = await prisma.organization.findUnique({
    where: { ownerId: got.userId },
  });
  if (!org) return null;
  return { ...got, organization: org };
}

/** Ответ 403, если арендатор «заморожен» вами на стороне платформы (поле Organization.suspended) */
export function rejectIfOrganizationSuspended(organization: { suspended: boolean }): NextResponse | null {
  if (organization.suspended) {
    return NextResponse.json({ error: "Аккаунт отключён администратором платформы" }, { status: 403 });
  }
  return null;
}
