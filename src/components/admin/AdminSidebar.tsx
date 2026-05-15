// Боковое меню на широком экране (на телефоне скрыто — см. AdminBottomNav)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { EffectiveOrgRole } from "@/lib/permissions";
import { getAdminNavItems, isAdminNavActive, orgRoleLabel } from "@/lib/admin-nav";

export function AdminSidebar({ orgRole }: { orgRole: EffectiveOrgRole }) {
  const pathname = usePathname();
  const items = getAdminNavItems(orgRole);

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100/80 dark:border-stone-800 dark:from-stone-950 dark:to-stone-900 lg:flex">
      <div className="border-b border-stone-200 px-4 py-4 dark:border-stone-800">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-800/80 dark:text-teal-300/80">Витрина записи</p>
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Панель мастера</p>
        <p className="mt-1 text-xs text-stone-500">Роль: {orgRoleLabel(orgRole)}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Разделы админки">
        {items.map((item) => {
          const active = isAdminNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-stone-700 hover:bg-white/80 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-stone-200 p-2 dark:border-stone-800">
        <button
          type="button"
          className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-stone-600 hover:bg-white/80 dark:text-stone-400 dark:hover:bg-stone-800"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
