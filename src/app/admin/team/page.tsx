// Сервер: загрузка владельца и участников для страницы команды
import { auth } from "@/auth";
import { getAdminOrganizationForUser } from "@/lib/admin-org";
import { prisma } from "@/lib/prisma";
import { TeamClient } from "./team-client";

export default async function AdminTeamPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const ctx = await getAdminOrganizationForUser(session.user.id);
  if (!ctx || (ctx.role !== "OWNER" && ctx.role !== "ADMIN")) {
    return (
      <p className="text-red-600">
        Раздел доступен только владельцу и администратору организации.
      </p>
    );
  }

  const owner = await prisma.user.findUnique({
    where: { id: ctx.organization.ownerId },
    select: { email: true, name: true },
  });

  const rows = await prisma.organizationMember.findMany({
    where: { organizationId: ctx.organization.id },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const initialMembers = rows.map((m) => ({
    id: m.id,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
    user: m.user,
  }));

  return (
    <TeamClient initialOwner={owner} initialMembers={initialMembers} currentRole={ctx.role} />
  );
}
