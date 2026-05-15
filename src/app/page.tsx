// Главная: посадочная для владельцев бизнеса — яркие, но сдержанные акценты
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  // Уже вошли — сразу в панель, без посадочной с кнопками «Вход»
  const session = await auth();
  if (session?.user) {
    redirect("/admin");
  }

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden bg-gradient-to-b from-teal-50/90 via-stone-50 to-rose-50/30 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950">
      {/* Тонкая линия сверху — визуальный «бренд-маркер», строгая геометрия */}
      <div
        className="h-1 w-full bg-gradient-to-r from-teal-600 via-emerald-500 to-rose-500"
        aria-hidden
      />
      <header className="border-b border-stone-200/80 bg-white/85 px-6 py-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-800/90 dark:text-teal-300/90">
              Запись онлайн
            </span>
            <span className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-50">Для мастеров</span>
          </div>
          <div className="flex gap-3 text-sm font-medium">
            <Link
              href="/login"
              className="text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
            >
              Вход
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-teal-700 px-3 py-1.5 text-white shadow-sm shadow-teal-900/10 transition hover:bg-teal-600"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Онлайн-запись, которая выглядит профессионально
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-stone-600 dark:text-stone-400">
          Настраиваете услуги и график в панели — клиенту остаётся одна ссылка. Меньше звонков, меньше хаоса в переписках:
          удобно и салону, и частному кабинету.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-teal-700 px-6 py-3 font-medium text-white shadow-md shadow-teal-900/15 transition hover:bg-teal-600"
          >
            Создать аккаунт
          </Link>
          <Link
            href="/login"
            className="rounded-xl border-2 border-stone-300 bg-white/80 px-6 py-3 font-medium text-stone-800 transition hover:border-teal-300 hover:bg-white dark:border-stone-600 dark:bg-stone-900/50 dark:text-stone-200 dark:hover:border-teal-700"
          >
            Уже есть аккаунт
          </Link>
        </div>
      </main>
    </div>
  );
}
