// Регистрация: создание аккаунта и письмо подтверждения; вход только после подтверждения
"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resentFlow, setResentFlow] = useState(false);

  return (
    <div className="flex min-h-full flex-col justify-center bg-gradient-to-b from-teal-50/50 via-stone-50 to-stone-100/80 px-4 py-12 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-stone-200/90 bg-white p-8 shadow-md shadow-stone-900/5 ring-1 ring-teal-100/50 dark:border-stone-800 dark:bg-stone-900 dark:ring-teal-900/20">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Регистрация</h1>
        <p className="mt-1 text-sm text-stone-500">Аккаунт и публичная витрина с вашей ссылкой на запись</p>
        <p className="mt-2 text-xs text-stone-500">
          14 дней бесплатного демо с момента регистрации. Данные сохраняются; для продолжения работы после демо потребуется{" "}
          <Link href="/payment" className="text-teal-800 underline dark:text-teal-300">
            оплата услуги
          </Link>
          . Регистрируясь, вы принимаете{" "}
          <Link href="/offer" className="text-teal-800 underline dark:text-teal-300">
            публичную оферту
          </Link>
          .
        </p>

        {done ? (
          <div className="mt-6 space-y-3 rounded-lg border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-100">
            <p>
              {resentFlow
                ? "Этот email уже был в системе без подтверждения — мы отправили новое письмо. Откройте ссылку из письма, затем войдите."
                : "Проверьте почту и перейдите по ссылке для подтверждения email. После этого можно войти."}
            </p>
            <p className="text-stone-600 dark:text-stone-400">
              Не пришло письмо? Проверьте настройки отправки почты в .env (SMTP) и папку «Спам», либо запросите повтор ниже.
            </p>
            <Link href="/resend-verification" className="inline-block font-medium text-teal-800 underline dark:text-teal-300">
              Повторить письмо
            </Link>
            <Link
              href="/login"
              className="mt-2 block w-full rounded-lg bg-teal-700 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-600"
            >
              Перейти ко входу
            </Link>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: email.trim().toLowerCase(),
                  password,
                  name: name.trim() || undefined,
                  businessName: businessName.trim(),
                }),
              });
              const data = await res.json().catch(() => ({}));
              setLoading(false);
              if (res.status === 503 && data.needsVerification) {
                setResentFlow(Boolean(data.resent));
                setDone(true);
                return;
              }
              if (!res.ok) {
                setError(typeof data.error === "string" ? data.error : "Ошибка регистрации");
                return;
              }
              setResentFlow(Boolean(data.resent));
              setDone(true);
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
        )}

        {!done ? (
          <p className="mt-4 text-center text-sm text-stone-500">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="font-medium text-teal-800 hover:underline dark:text-teal-300">
              Войти
            </Link>
          </p>
        ) : null}
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
