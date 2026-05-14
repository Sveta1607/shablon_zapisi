// Установка нового пароля по токену из query (письмо ведёт сюда)
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md dark:border-stone-800 dark:bg-stone-900">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Новый пароль</h1>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">Откройте ссылку из письма целиком.</p>
          <p className="mt-6 text-center text-sm">
            <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
              Вернуться ко входу
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md dark:border-stone-800 dark:bg-stone-900">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Новый пароль</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">Минимум 8 символов.</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const res = await fetch("/api/auth/reset-password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, password }),
            });
            const data = await res.json().catch(() => ({}));
            setLoading(false);
            if (!res.ok) {
              setError(typeof data.error === "string" ? data.error : "Не удалось обновить пароль");
              return;
            }
            router.push("/login?notice=password-reset");
            router.refresh();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Новый пароль</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 py-2.5 font-medium text-white hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? "Сохранение…" : "Сохранить"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </div>
  );
}
