// Простая посадочная: вход для владельцев и краткое описание продукта
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">Запись клиентов</span>
          <div className="flex gap-3 text-sm font-medium">
            <Link href="/login" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              Вход
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-500"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-4xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Онлайн-запись для вашего бизнеса
        </h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Настройте услуги и расписание в админ-панели, отправьте клиентам одну ссылку — они выберут время без звонков и
          переписок.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/register" className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500">
            Создать аккаунт
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-zinc-300 px-6 py-3 font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Уже есть аккаунт
          </Link>
        </div>
      </main>
    </div>
  );
}
