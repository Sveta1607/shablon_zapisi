// Экран после 14 дней демо: контакты для оплаты или сообщение об отклонении
import Link from "next/link";
import { BillingPaymentLink } from "@/components/billing/BillingPaymentLink";
import { DemoExpiredContacts } from "@/components/billing/DemoExpiredContacts";
import { auth } from "@/auth";
import { getOwnerBillingReviewStatus } from "@/lib/billing-queue";
import { formatServicePriceRub } from "@/lib/billing-public";

const billingEmail = process.env.NEXT_PUBLIC_BILLING_EMAIL?.trim();
const billingPhone = process.env.NEXT_PUBLIC_BILLING_PHONE?.trim();

export default async function DemoExpiredPage() {
  const session = await auth();
  const reviewStatus =
    session?.user?.id != null ? await getOwnerBillingReviewStatus(session.user.id) : null;
  const rejected = reviewStatus === "REJECTED";

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-stone-100/90 px-4 py-16 dark:bg-stone-950">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-md dark:border-stone-700 dark:bg-stone-900">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
          {rejected ? "Доступ не предоставлен" : "Демо-период закончился"}
        </h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          {rejected
            ? "Заявка на продолжение работы с сервисом не одобрена. Ваши данные в базе сохранены. По вопросам оплаты или повторного рассмотрения — контакты ниже."
            : `14 дней бесплатного доступа с момента регистрации истекли. Ваши услуги, расписание и записи в базе сохранены — после оплаты услуги (${formatServicePriceRub()}) доступ к панели и витрине откроется снова.`}
        </p>
        {!rejected ? (
          <p className="mt-4 text-sm">
            <BillingPaymentLink className="font-medium text-teal-800 underline underline-offset-2 hover:text-teal-600 dark:text-teal-300" />
          </p>
        ) : null}
        <DemoExpiredContacts email={billingEmail} phone={billingPhone} />
        <p className="mt-6">
          <Link href="/login" className="text-sm font-medium text-teal-800 hover:underline dark:text-teal-300">
            Войти в другой аккаунт
          </Link>
        </p>
      </div>
    </div>
  );
}
