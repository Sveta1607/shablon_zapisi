// Шапка очереди платформы с выходом
"use client";

import { useRouter } from "next/navigation";

export function PlatformQueueHeader() {
  const router = useRouter();

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Пользователи платформы</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Фильтры: демо, доступ открыт, пропущено, отклонён. В «Все» — группы по статусу, сверху очередь после демо.
        </p>
      </div>
      <button
        type="button"
        className="text-sm font-medium text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
        onClick={async () => {
          await fetch("/api/platform/auth", { method: "DELETE" });
          router.push("/platform/login");
          router.refresh();
        }}
      >
        Выйти
      </button>
    </header>
  );
}
