// Доступ к API админки: сессия, организация владельца или участника, проверка прав и suspended
import { auth } from "@/auth";
import type { Organization } from "@prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EffectiveOrgRole, OrgPermission } from "@/lib/permissions";
import { hasOrgPermission } from "@/lib/permissions";

export type OrganizationContext = {
  session: Session;
  userId: string;
  organization: Organization;
  role: EffectiveOrgRole;
};

/** Требуется любая валидная сессия NextAuth */
export async function requireSessionUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return { session, userId };
}

type RequireOrgOptions = {
  /** Если задано — проверяем матрицу прав для этой операции */
  permission?: OrgPermission;
};

/**
 * Находит организацию текущего пользователя (как владелец или участник).
 * При permission отклоняет STAFF для операций без доступа.
 */
export async function requireOrganization(options?: RequireOrgOptions): Promise<OrganizationContext | null> {
  const got = await requireSessionUser();
  if (!got) return null;

  const ownerOrg = await prisma.organization.findUnique({
    where: { ownerId: got.userId },
  });
  if (ownerOrg) {
    const role: EffectiveOrgRole = "OWNER";
    if (options?.permission && !hasOrgPermission(role, options.permission)) {
      return null;
    }
    return { session: got.session, userId: got.userId, organization: ownerOrg, role };
  }

  const member = await prisma.organizationMember.findFirst({
    where: { userId: got.userId },
    include: { organization: true },
  });
  if (!member) return null;

  const role: EffectiveOrgRole = member.role;
  if (options?.permission && !hasOrgPermission(role, options.permission)) {
    return null;
  }

  return {
    session: got.session,
    userId: got.userId,
    organization: member.organization,
    role,
  };
}

/** Только владелец организации (приглашение сотрудников, опасные операции) */
export async function requireOrganizationOwner(): Promise<OrganizationContext | null> {
  const ctx = await requireOrganization();
  if (!ctx || ctx.role !== "OWNER") return null;
  return ctx;
}

export function rejectIfOrganizationSuspended(organization: { suspended: boolean }): NextResponse | null {
  if (organization.suspended) {
    return NextResponse.json({ error: "Аккаунт отключён администратором платформы" }, { status: 403 });
  }
  return null;
}
