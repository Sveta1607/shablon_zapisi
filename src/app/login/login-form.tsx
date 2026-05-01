// Форма входа: email/пароль и опционально Google через NextAuth
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/admin";
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
        {notice === "password-reset" ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            Пароль обновлён. Войдите с новым паролем.
          </p>
        ) : null}
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const res = await signIn("credentials", {
              email: email.trim().toLowerCase(),
              password,
              redirect: false,
            });
            setLoading(false);
            if (res?.error) {
              setError("Неверный email или пароль");
              return;
            }
            router.push(callbackUrl.startsWith("/") ? callbackUrl : "/admin");
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
        <p className="mt-2 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Забыли пароль?
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-stone-500">
          Подтверждение email сейчас не требуется — после регистрации можно сразу войти.
        </p>
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="mt-3 w-full rounded-lg border border-stone-300 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Войти через Google
        </button>
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
