// Каркас админки: сессия, организация владельца или участника, роль для меню и прав
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
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
    <div className="flex min-h-screen bg-stone-50/90 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <AdminSidebar orgRole={role} />
      <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">
        <AdminTrialBanner organization={org} />
        {children}
      </main>
    </div>
  );
}
