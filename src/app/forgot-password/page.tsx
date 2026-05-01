// Сброс пароля по почте отключён (без SMTP/Resend); позже можно подключить провайдера писем
"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Сброс пароля</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Автоматическая отправка ссылки на почту сейчас отключена. Создайте новый аккаунт с другим email или обратитесь к
          администратору, который разворачивает приложение.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
