// Регистрация: создаёт пользователя, организацию и расписание по умолчанию, затем перенаправляет на вход
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md shadow-stone-900/5 ring-1 ring-teal-100/50 dark:border-stone-800 dark:bg-stone-900 dark:ring-teal-900/20">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Регистрация</h1>
        <p className="mt-1 text-sm text-stone-500">Аккаунт и публичная витрина с вашей ссылкой на запись</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const res = await fetch("/api/auth/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password, name: name || undefined, businessName }),
            });
            const data = await res.json().catch(() => ({}));
            setLoading(false);
            if (!res.ok) {
              setError(typeof data.error === "string" ? data.error : "Ошибка регистрации");
              return;
            }
            const sign = await signIn("credentials", { email, password, redirect: false });
            if (sign?.error) {
              router.push("/login");
              return;
            }
            router.push("/admin");
            router.refresh();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Название бизнеса</label>
            <input
              required
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Например, Студия красоты «Лилия»"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Ваше имя (необязательно)</label>
            <input
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Пароль (от 8 символов)</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
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
            {loading ? "Создание…" : "Создать аккаунт"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
