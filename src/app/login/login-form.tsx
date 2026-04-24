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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Вход</h1>
        <p className="mt-1 text-sm text-zinc-500">Админ-панель для владельца бизнеса</p>
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
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Пароль</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Регистрация
          </Link>
        </p>
      </div>
    </div>
  );
}
