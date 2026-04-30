// Страница запроса reset-ссылки: пользователь вводит email и получает письмо (или dev-ссылку в логах)
"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md shadow-stone-900/5 ring-1 ring-teal-100/50 dark:border-stone-800 dark:bg-stone-900 dark:ring-teal-900/20">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Сброс пароля</h1>
        <p className="mt-1 text-sm text-stone-500">Введите email, и мы отправим ссылку для смены пароля.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setDone(false);
            setLoading(true);
            const res = await fetch("/api/auth/forgot-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const data = await res.json().catch(() => ({}));
            setLoading(false);
            if (!res.ok) {
              setError(typeof data.error === "string" ? data.error : "Не удалось отправить ссылку");
              return;
            }
            setDone(true);
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
          {/* Сообщение подтверждает отправку без раскрытия, есть ли email в системе */}
          {done ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Если аккаунт существует, ссылка для сброса отправлена на почту.
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 py-2.5 font-medium text-white shadow-sm hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? "Отправка…" : "Отправить ссылку"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-500">
          <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
