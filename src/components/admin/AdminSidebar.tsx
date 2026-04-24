// Боковое меню админ-панели: навигация по разделам и выход из аккаунта
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const items = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/services", label: "Услуги" },
  { href: "/admin/schedule", label: "Расписание" },
  { href: "/admin/bookings", label: "Записи" },
  { href: "/admin/settings", label: "Настройки" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Запись клиентов</p>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Админ-панель</p>
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
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <button
          type="button"
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
