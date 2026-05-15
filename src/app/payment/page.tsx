// Информация об оплате доступа после демо-периода
import Link from "next/link";
import { LegalDocLayout } from "@/components/marketing/LegalDocLayout";
import { formatServicePriceRub, getServicePriceRub } from "@/lib/billing-public";

const billingEmail = process.env.NEXT_PUBLIC_BILLING_EMAIL?.trim() || "Sharunkina2014@yandex.ru";
const billingPhone = process.env.NEXT_PUBLIC_BILLING_PHONE?.trim() || "+7 951 865-39-06";
const priceFormatted = formatServicePriceRub();
const priceAmount = getServicePriceRub();

export default function PaymentPage() {
  return (
    <LegalDocLayout title="Оплата и тариф">
      <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-6 dark:border-teal-900/50 dark:bg-teal-950/30">
        <p className="text-sm font-medium uppercase tracking-wide text-teal-900/80 dark:text-teal-200/80">
          Доступ после демо
        </p>
        <p className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-50">{priceFormatted}</p>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Разовая оплата за продолжение работы с панелью мастера и публичной онлайн-записью. Подписка не оформляется —
          оплата одного периода доступа по условиям{" "}
          <Link href="/offer" className="font-medium text-teal-800 underline dark:text-teal-300">
            публичной оферты
          </Link>
          .
        </p>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-stone-900 dark:text-stone-100">Что входит</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-stone-700 dark:text-stone-300">
        <li>Панель мастера: услуги, расписание, журнал записей, настройки витрины.</li>
        <li>Публичная страница записи для клиентов по вашей ссылке.</li>
        <li>Сохранение данных, созданных в демо-периоде (14 дней с регистрации).</li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-stone-900 dark:text-stone-100">Как оплатить</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-stone-700 dark:text-stone-300">
        <li>
          Свяжитесь с нами по почте{" "}
          <a href={`mailto:${billingEmail}`} className="font-medium text-teal-800 underline dark:text-teal-300">
            {billingEmail}
          </a>{" "}
          или телефону{" "}
          <a href={`tel:${billingPhone.replace(/\s/g, "")}`} className="font-medium text-teal-800 underline dark:text-teal-300">
            {billingPhone}
          </a>
          .
        </li>
        <li>
          Укажите email, с которым регистрировались в сервисе, и что оплачиваете доступ после демо ({priceFormatted}).
        </li>
        <li>Мы пришлём реквизиты для перевода и после поступления оплаты откроем доступ к панели.</li>
      </ol>

      <p className="mt-8 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-400">
        Сумма {priceAmount.toLocaleString("ru-RU")} руб. может быть изменена с публикацией новой редакции оферты; при
        оплате действует цена, указанная на этой странице на момент обращения.
      </p>
    </LegalDocLayout>
  );
}
