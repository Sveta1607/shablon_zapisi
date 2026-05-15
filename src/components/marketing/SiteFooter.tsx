// Футер маркетинговых страниц: оферта и оплата
import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-stone-200/80 bg-white/50 px-6 py-6 dark:border-stone-800 dark:bg-stone-950/50">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center text-sm text-stone-600 dark:text-stone-400">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/offer" className="font-medium text-stone-700 underline-offset-2 hover:text-teal-800 hover:underline dark:text-stone-300 dark:hover:text-teal-300">
            Публичная оферта
          </Link>
          <span className="hidden text-stone-300 sm:inline dark:text-stone-600" aria-hidden>
            ·
          </span>
          <Link
            href="/payment"
            className="font-medium text-stone-700 underline-offset-2 hover:text-teal-800 hover:underline dark:text-stone-300 dark:hover:text-teal-300"
          >
            Оплата и тариф
          </Link>
        </nav>
        <p className="text-xs text-stone-500">© {year} — сервис онлайн-записи для мастеров</p>
      </div>
    </footer>
  );
}
