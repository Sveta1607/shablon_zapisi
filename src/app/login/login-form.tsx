// Форма входа (клиентский компонент: useSearchParams для callbackUrl)
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/admin";
  // Сообщение из query-параметров помогает показать результат verify/reset без отдельного стейта между страницами
  const notice = search.get("notice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md shadow-stone-900/5 ring-1 ring-teal-100/50 dark:border-stone-800 dark:bg-stone-900 dark:ring-teal-900/20">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Вход</h1>
        <p className="mt-1 text-sm text-stone-500">Панель владельца: услуги, расписание и витрина записи</p>
        {/* Плашка нужна для сценариев после подтверждения email и смены пароля */}
        {notice === "verified" || notice === "password-reset" ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {notice === "verified"
              ? "Email подтвержден. Теперь можно войти в аккаунт."
              : "Пароль обновлен. Войдите с новым паролем."}
          </p>
        ) : null}
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const res = await signIn("credentials", {
              email,
              password,
              redirect: false,
            });
            setLoading(false);
            if (res?.error) {
              setError("Неверный email или пароль");
              return;
            }
            router.push(callbackUrl);
            router.refresh();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Пароль</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 py-2.5 font-medium text-white shadow-sm hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Регистрация
          </Link>
        </p>
        {/* Ссылка на восстановление нужна для self-service reset без участия администратора */}
        <p className="mt-2 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Забыли пароль?
          </Link>
        </p>
        {/* Ссылка нужна для повторной отправки подтверждения, если пользователь не нашел первое письмо */}
        <p className="mt-2 text-center text-sm">
          <Link href="/resend-verification" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Не пришло письмо подтверждения?
          </Link>
        </p>
        {/* Кнопка OAuth-потока даёт альтернативный вход через Google при наличии provider-конфига */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="mt-3 w-full rounded-lg border border-stone-300 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Войти через Google
        </button>
        {/* Кнопка возврата нужна, чтобы пользователь мог быстро вернуться на главную страницу из экрана входа */}
        <Link
          href="/"
          className="mt-3 block w-full rounded-lg border border-stone-300 py-2.5 text-center text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
