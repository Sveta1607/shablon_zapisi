// Нижняя панель навигации на телефоне (фиксированная, с safe-area)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EffectiveOrgRole } from "@/lib/permissions";
import { getAdminNavItems, isAdminNavActive } from "@/lib/admin-nav";
import { AdminNavIcon } from "@/components/admin/AdminNavIcon";

export function AdminBottomNav({ orgRole }: { orgRole: EffectiveOrgRole }) {
  const pathname = usePathname();
  const items = getAdminNavItems(orgRole);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/95 lg:hidden"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      aria-label="Разделы админки"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {items.map((item) => {
          const active = isAdminNavActive(pathname, item.href);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <Link
                href={item.href}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium leading-tight transition-colors sm:text-xs ${
                  active
                    ? "text-teal-800 dark:text-teal-300"
                    : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                }`}
              >
                <span className={active ? "text-teal-700 dark:text-teal-400" : undefined}>
                  <AdminNavIcon name={item.icon} className="h-5 w-5" />
                </span>
                <span className="truncate">{item.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
