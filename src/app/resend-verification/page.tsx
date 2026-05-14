// Повторная отправка письма подтверждения до первого входа
"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Повторное письмо</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Укажите email при регистрации. Если аккаунт есть и почта ещё не подтверждена, мы отправим ссылку снова.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setMessage(null);
            setLoading(true);
            const res = await fetch("/api/auth/resend-verification", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            const data = await res.json().catch(() => ({}));
            setLoading(false);
            if (!res.ok) {
              setMessage(typeof data.error === "string" ? data.error : "Ошибка");
              return;
            }
            setMessage("Если email подходит, проверьте почту.");
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
          {message ? <p className="text-sm text-teal-800 dark:text-teal-300">{message}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 py-2.5 font-medium text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? "Отправка…" : "Отправить"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Перейти ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
