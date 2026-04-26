// Общий каркас админки: проверка сессии на сервере (без Edge-middleware — там нельзя тянуть Prisma)
import { auth } from "@/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin");
  }
  // Заблокированный вами арендатор (Organization.suspended) — без доступа в админку
  const org = await prisma.organization.findUnique({ where: { ownerId: session.user.id } });
  if (org?.suspended) {
    redirect("/account-suspended");
  }

  return (
    <div className="flex min-h-screen bg-stone-50/90 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-auto p-6 md:p-8">{children}</main>
    </div>
  );
}
