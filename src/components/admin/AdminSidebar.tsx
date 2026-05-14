// Боковое меню: пункты в зависимости от роли (STAFF не видит услуги и настройки)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { EffectiveOrgRole } from "@/lib/permissions";
import { hasOrgPermission } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  /** Если задано — пункт показывается только при наличии права */
  permission?: import("@/lib/permissions").OrgPermission;
};

const ALL_ITEMS: NavItem[] = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/services", label: "Услуги", permission: "services" },
  { href: "/admin/schedule", label: "Расписание", permission: "schedule" },
  { href: "/admin/bookings", label: "Записи", permission: "bookings" },
  { href: "/admin/settings", label: "Настройки", permission: "organization_settings" },
  { href: "/admin/team", label: "Команда" },
];

export function AdminSidebar({ orgRole }: { orgRole: EffectiveOrgRole }) {
  const pathname = usePathname();

  const items = ALL_ITEMS.filter((item) => {
    if (item.href === "/admin/team") {
      return orgRole === "OWNER" || orgRole === "ADMIN";
    }
    if (!item.permission) return true;
    return hasOrgPermission(orgRole, item.permission);
  });

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100/80 dark:border-stone-800 dark:from-stone-950 dark:to-stone-900">
      <div className="border-b border-stone-200 px-4 py-4 dark:border-stone-800">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-800/80 dark:text-teal-300/80">Витрина записи</p>
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Панель мастера</p>
        <p className="mt-1 text-xs text-stone-500">
          Роль:{" "}
          {orgRole === "OWNER" ? "Владелец" : orgRole === "ADMIN" ? "Админ" : "Сотрудник"}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
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
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-stone-600 hover:bg-white/80 dark:text-stone-400 dark:hover:bg-stone-800"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
