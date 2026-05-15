// Общая вёрстка юридических страниц (оферта, оплата)
import Link from "next/link";
import { SiteFooter } from "@/components/marketing/SiteFooter";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function LegalDocLayout({ title, children }: Props) {
  return (
    <div className="flex min-h-full flex-col bg-stone-50 dark:bg-stone-950">
      <header className="border-b border-stone-200 bg-white px-6 py-4 dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold text-teal-800 hover:underline dark:text-teal-300">
            ← На главную
          </Link>
          <span className="text-xs text-stone-500">Запись онлайн</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">{title}</h1>
        <article className="mt-6 space-y-4 text-sm leading-relaxed text-stone-700 sm:text-base dark:text-stone-300">
          {children}
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
