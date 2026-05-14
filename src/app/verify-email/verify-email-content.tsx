// Статическая подсказка: подтверждение идёт через GET /api/auth/verify-email?token= из письма
"use client";

import Link from "next/link";

export function VerifyEmailContent() {
  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 text-center shadow-md dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Подтверждение email</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Перейдите по ссылке из письма — браузер подтвердит адрес и перенаправит на вход. Если письма нет, проверьте настройку{" "}
          <code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-800">RESEND_API_KEY</code> или запросите повторную отправку.
        </p>
        <p className="mt-6 flex flex-col gap-2 text-sm">
          <Link href="/resend-verification" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Повторить письмо
          </Link>
          <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Перейти ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
