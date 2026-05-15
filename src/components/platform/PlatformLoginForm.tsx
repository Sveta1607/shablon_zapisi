// Форма входа в панель платформы по секрету из .env
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function PlatformLoginForm() {
  const search = useSearchParams();
  const sessionLost = search.get("reason") === "session";
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
          const res = await fetch("/api/platform/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ secret: secret.trim() }),
          });
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          if (!res.ok) {
            setError(typeof d.error === "string" ? d.error : `Ошибка входа (${res.status})`);
            setLoading(false);
            return;
          }
          // Полная перезагрузка — чтобы сервер увидел httpOnly cookie
          window.location.href = "/platform/queue";
        } catch {
          setError("Не удалось связаться с сервером. Проверьте, что сайт запущен.");
          setLoading(false);
        }
      }}
    >
      {sessionLost ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          Сессия не сохранилась — cookie не доходит до страницы очереди. На Amvera проверьте:{" "}
          <strong>PLATFORM_ADMIN_SECRET</strong> совпадает с секретом в переменных; <strong>AUTH_URL</strong> — точный
          публичный URL с <code className="text-xs">https://...</code> (без localhost). Если заходите по HTTP или после
          входа снова этот экран — попробуйте переменную <strong>PLATFORM_COOKIE_SECURE=0</strong> и пересборку.
        </p>
      ) : null}
      <div>
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Секрет платформы (PLATFORM_ADMIN_SECRET)
        </label>
        <input
          type="password"
          required
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-teal-700 py-2.5 font-medium text-white hover:bg-teal-600 disabled:opacity-50"
      >
        {loading ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}
