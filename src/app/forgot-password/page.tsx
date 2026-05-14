// Запрос ссылки сброса пароля на email (ответ всегда одинаковый для безопасности)
"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Сброс пароля</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Укажите email аккаунта. Если он есть и подтверждён, придёт письмо со ссылкой (настройте{" "}
          <code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-800">RESEND_API_KEY</code> и{" "}
          <code className="rounded bg-stone-100 px-1 text-xs dark:bg-stone-800">EMAIL_FROM</code> для отправки).
        </p>

        {sent ? (
          <p className="mt-6 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-900/40 dark:bg-teal-950/40 dark:text-teal-100">
            Если аккаунт найден, проверьте почту. Ссылка действует ограниченное время.
          </p>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
              });
              setLoading(false);
              setSent(true);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 py-2.5 font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {loading ? "Отправка…" : "Отправить ссылку"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
