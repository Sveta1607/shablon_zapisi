// Страница: аккаунт отключён владельцем платформы (Organization.suspended = true)
import Link from "next/link";

export default function AccountSuspendedPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-stone-100/90 px-4 py-16 dark:bg-stone-950">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-md dark:border-stone-700 dark:bg-stone-900">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Доступ к сервису отключён</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          Ваш аккаунт остановлен администратором. Онлайн-запись и вход в панель недоступны, пока доступ не откроют снова.
        </p>
        <p className="mt-2 text-xs text-stone-500">Если это ошибка, свяжитесь с тем, кто разворачивает для вас этот шаблон.</p>
        <p className="mt-6">
          <Link href="/" className="text-sm font-medium text-teal-800 hover:underline dark:text-teal-300">
            На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
