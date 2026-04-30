// Страница подтверждения email по токену: выполняет verify-запрос и направляет пользователя ко входу
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const search = useSearchParams();
  const router = useRouter();
  // Токен читаем из query заранее, чтобы избежать синхронных setState внутри useEffect
  const token = (search.get("token") || "").trim();
  const [message, setMessage] = useState("Подтверждаем email…");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    // Проверка токена на сервере завершает регистрацию и открывает доступ ко входу
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(typeof d.error === "string" ? d.error : "Не удалось подтвердить email");
        }
        setError(false);
        setMessage("Email подтвержден. Перенаправляем на страницу входа…");
        setTimeout(() => router.push("/login?notice=verified"), 1200);
      })
      .catch((e: unknown) => {
        setError(true);
        setMessage(e instanceof Error ? e.message : "Не удалось подтвердить email");
      });
  }, [router, token]);

  // Отдельный ранний рендер для пустого токена делает сообщение явным без лишних перерисовок в эффекте
  if (!token) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Подтверждение email</h1>
          <p className="mt-3 text-sm text-red-600">Ссылка подтверждения недействительна: не найден токен.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Подтверждение email</h1>
        <p className={`mt-3 text-sm ${error ? "text-red-600" : "text-stone-600 dark:text-stone-300"}`}>{message}</p>
      </div>
    </div>
  );
}
