// Каркас админки: сессия, организация, мобильная оболочка и права по роли
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTrialBanner } from "@/components/admin/AdminTrialBanner";
import { getAdminOrganizationForUser } from "@/lib/admin-org";
import { redirect } from "next/navigation";
import { hasActiveServiceAccess } from "@/lib/org-access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }

  const ctx = await getAdminOrganizationForUser(session.user.id);
  if (!ctx) {
    redirect("/login?callbackUrl=/admin");
  }

  const { organization: org, role } = ctx;

  if (org.suspended) {
    redirect("/account-suspended");
  }

  if (!hasActiveServiceAccess(org)) {
    redirect("/demo-expired");
  }

  return (
    <AdminShell orgRole={role}>
      <AdminTrialBanner organization={org} />
      {children}
    </AdminShell>
  );
}
