// Форма входа в панель платформы по секрету из .env
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PlatformLoginForm() {
  const router = useRouter();
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
        const res = await fetch("/api/platform/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret }),
        });
        setLoading(false);
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setError(typeof d.error === "string" ? d.error : "Не удалось войти");
          return;
        }
        router.push("/platform/queue");
        router.refresh();
      }}
    >
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
