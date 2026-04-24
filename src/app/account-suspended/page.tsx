// Страница: аккаунт отключён владельцем платформы (Organization.suspended = true)
import Link from "next/link";

export default function AccountSuspendedPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Доступ к сервису отключён</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Ваш аккаунт остановлен администратором. Онлайн-запись и вход в панель недоступны, пока доступ не откроют снова.
        </p>
        <p className="mt-2 text-xs text-zinc-500">Если это ошибка, свяжитесь с тем, кто разворачивает для вас этот шаблон.</p>
        <p className="mt-6">
          <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
            На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
