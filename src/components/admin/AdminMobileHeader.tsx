// Верхняя полоса на телефоне: заголовок и меню (выход, роль)
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import type { EffectiveOrgRole } from "@/lib/permissions";
import { orgRoleLabel } from "@/lib/admin-nav";

export function AdminMobileHeader({ orgRole }: { orgRole: EffectiveOrgRole }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/95 lg:hidden">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-teal-800/80 dark:text-teal-300/80">
            Витрина записи
          </p>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Панель мастера</p>
        </div>
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-white text-stone-700 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200"
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          aria-label="Меню"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <div
            id="admin-mobile-menu"
            className="fixed right-0 top-0 z-50 flex h-full w-[min(100%,18rem)] flex-col border-l border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900 lg:hidden"
            style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
          >
            <div className="border-b border-stone-200 px-4 py-4 dark:border-stone-800">
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Аккаунт</p>
              <p className="mt-1 text-xs text-stone-500">Роль: {orgRoleLabel(orgRole)}</p>
            </div>
            <div className="mt-auto border-t border-stone-200 p-3 dark:border-stone-800">
              <button
                type="button"
                className="w-full rounded-lg bg-stone-100 px-3 py-3 text-sm font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-100"
                onClick={() => {
                  setOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
              >
                Выйти
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
