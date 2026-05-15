// Вход в панель платформы (очередь после демо)
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PlatformLoginForm } from "@/components/platform/PlatformLoginForm";
import { isPlatformAdminSession } from "@/lib/platform-auth";

export default async function PlatformLoginPage() {
  if (await isPlatformAdminSession()) {
    redirect("/platform/queue");
  }

  return (
    <div className="flex min-h-full flex-col justify-center bg-stone-100/90 px-4 py-16 dark:bg-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-md dark:border-stone-700 dark:bg-stone-900">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Панель платформы</h1>
        <p className="mt-1 text-sm text-stone-500">Очередь после окончания демо</p>
        <Suspense
          fallback={
            <p className="mt-6 text-sm text-stone-500">Загрузка…</p>
          }
        >
          <PlatformLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
