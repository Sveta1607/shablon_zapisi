// Оболочка админки: боковое меню на десктопе, нижняя панель и шапка на телефоне
"use client";

import type { EffectiveOrgRole } from "@/lib/permissions";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { AdminMobileHeader } from "@/components/admin/AdminMobileHeader";

type Props = {
  orgRole: EffectiveOrgRole;
  children: React.ReactNode;
};

export function AdminShell({ orgRole, children }: Props) {
  return (
    <div className="flex min-h-screen bg-stone-50/90 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <AdminSidebar orgRole={orgRole} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminMobileHeader orgRole={orgRole} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-5 lg:px-8 lg:py-6 lg:pb-8">
          {children}
        </main>
        <AdminBottomNav orgRole={orgRole} />
      </div>
    </div>
  );
}
