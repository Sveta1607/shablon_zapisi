// Определяет организацию и роль пользователя (владелец или участник) для серверных страниц админки
import type { Organization } from "@prisma/client";
import type { EffectiveOrgRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export type AdminOrgContext = {
  organization: Organization;
  role: EffectiveOrgRole;
};

/** Один запрос владельца, иначе участник; null если нет привязки */
export async function getAdminOrganizationForUser(userId: string): Promise<AdminOrgContext | null> {
  const ownerOrg = await prisma.organization.findUnique({
    where: { ownerId: userId },
  });
  if (ownerOrg) {
    return { organization: ownerOrg, role: "OWNER" };
  }
  const member = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true },
  });
  if (!member) return null;
  return { organization: member.organization, role: member.role };
}
