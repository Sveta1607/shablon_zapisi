// Обзор: сегодняшние записи, быстрые действия и ссылка на публичную витрину
import Link from "next/link";
import { auth } from "@/auth";
import { CopyBookingLink } from "@/components/admin/CopyBookingLink";
import { formatOrgDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatInTimeZone, toDate } from "date-fns-tz";

export default async function AdminDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const org = await prisma.organization.findUnique({
    where: { ownerId: userId },
  });
  if (!org) {
    return <p className="text-red-600">Организация не найдена. Обратитесь в поддержку.</p>;
  }

  const now = new Date();
  const ymd = formatInTimeZone(now, org.timezone, "yyyy-MM-dd");
  const dayStart = toDate(`${ymd} 00:00:00`, { timeZone: org.timezone });
  const dayEnd = toDate(`${ymd} 23:59:59.999`, { timeZone: org.timezone });

  const todayBookings = await prisma.booking.findMany({
    where: {
      organizationId: org.id,
      status: { not: "CANCELLED" },
      startsAt: { gte: dayStart, lte: dayEnd },
    },
    include: { service: true },
    orderBy: { startsAt: "asc" },
  });

  const upcoming = await prisma.booking.count({
    where: {
      organizationId: org.id,
      status: { not: "CANCELLED" },
      startsAt: { gte: now },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Обзор</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Добро пожаловать, {session.user?.name || session.user?.email}. Ближайших активных записей: {upcoming}.
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Публичная запись</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Отправьте клиентам ссылку ниже — они увидят ваши услуги и свободное время без входа в админку.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <CopyBookingLink slug={org.slug} />
          <Link
            href={`/book/${org.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Открыть как клиент →
          </Link>
        </div>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          /book/{org.slug}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Записи на сегодня</h2>
        <p className="text-sm text-zinc-500">Часовой пояс: {org.timezone}</p>
        <ul className="mt-3 space-y-2">
          {todayBookings.length === 0 ? (
            <li className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-600">
              На сегодня записей нет
            </li>
          ) : (
            todayBookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/40"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {formatOrgDateTime(b.startsAt, org.timezone)} — {b.service.name}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {b.clientName}, {b.clientPhone}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
