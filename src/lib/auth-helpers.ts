// Доступ к API админки: сессия, организация владельца или участника, проверка прав и suspended
import { auth } from "@/auth";
import type { Organization } from "@prisma/client";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { EffectiveOrgRole, OrgPermission } from "@/lib/permissions";
import { hasOrgPermission } from "@/lib/permissions";
import { hasActiveServiceAccess, type OrgAccessRecord } from "@/lib/org-access";
import { getOrganizationAccessRecord } from "@/lib/org-access-db";

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
    const access = await getOrganizationAccessRecord(ownerOrg);
    return {
      session: got.session,
      userId: got.userId,
      organization: { ...ownerOrg, servicePurchasedAt: access.servicePurchasedAt },
      role,
    };
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

  const access = await getOrganizationAccessRecord(member.organization);
  return {
    session: got.session,
    userId: got.userId,
    organization: { ...member.organization, servicePurchasedAt: access.servicePurchasedAt },
    role,
  };
}

/** Только владелец организации (приглашение сотрудников, опасные операции) */
export async function requireOrganizationOwner(): Promise<OrganizationContext | null> {
  const ctx = await requireOrganization();
  if (!ctx || ctx.role !== "OWNER") return null;
  return ctx;
}

function rejectIfPlatformSuspended(organization: { suspended: boolean }): NextResponse | null {
  if (organization.suspended) {
    return NextResponse.json({ error: "Аккаунт отключён администратором платформы" }, { status: 403 });
  }
  return null;
}

/** Блокировка API: отключение платформой или демо закончилось без покупки услуги */
export function rejectIfOrganizationBlocked(organization: OrgAccessRecord): NextResponse | null {
  const suspended = rejectIfPlatformSuspended(organization);
  if (suspended) return suspended;
  if (!hasActiveServiceAccess(organization)) {
    return NextResponse.json(
      {
        error: "Демо-период закончился. Оплатите услугу, чтобы снова открыть панель и онлайн-запись.",
        code: "demo_expired",
      },
      { status: 403 }
    );
  }
  return null;
}

/** То же, что rejectIfOrganizationBlocked — имя сохранено для существующих API-роутов */
export function rejectIfOrganizationSuspended(organization: OrgAccessRecord): NextResponse | null {
  return rejectIfOrganizationBlocked(organization);
}
