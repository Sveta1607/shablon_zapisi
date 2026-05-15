// Публичная оферта на оказание услуг по доступу к сервису онлайн-записи
import Link from "next/link";
import { LegalDocLayout } from "@/components/marketing/LegalDocLayout";
import { formatServicePriceRub } from "@/lib/billing-public";

const billingEmail = process.env.NEXT_PUBLIC_BILLING_EMAIL?.trim() || "Sharunkina2014@yandex.ru";
const billingPhone = process.env.NEXT_PUBLIC_BILLING_PHONE?.trim() || "+7 951 865-39-06";
const price = formatServicePriceRub();

export default function OfferPage() {
  return (
    <LegalDocLayout title="Публичная оферта">
      <p className="text-sm text-stone-500">Дата публикации: май 2026</p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900 dark:text-stone-100">1. Общие положения</h2>
      <p>
        Настоящий документ является официальным предложением (публичной офертой) любому дееспособному лицу заключить
        договор на условиях, изложенных ниже. Регистрация в сервисе «Витрина записи» / «Запись онлайн для мастеров» и
        использование функционала означает полное и безоговорочное принятие оферты.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900 dark:text-stone-100">2. Предмет договора</h2>
      <p>
        Исполнитель предоставляет Заказчику доступ к веб-сервису: панель мастера, настройка услуг и расписания,
        публичная страница онлайн-записи для клиентов. Состав и объём функций определяются возможностями сервиса на
        момент оказания услуги.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900 dark:text-stone-100">3. Демо-период и оплата</h2>
      <p>
        С момента регистрации предоставляется бесплатный демо-доступ сроком 14 (четырнадцать) календарных суток. По
        истечении демо для продолжения работы необходима разовая оплата доступа к услуге в размере{" "}
        <strong>{price}</strong> (актуальная сумма и порядок оплаты — на странице{" "}
        <Link href="/payment" className="font-medium text-teal-800 underline dark:text-teal-300">
          «Оплата и тариф»
        </Link>
        ). Данные Заказчика (услуги, расписание, записи) сохраняются в базе и становятся доступны после подтверждения
        оплаты.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900 dark:text-stone-100">4. Порядок акцепта и оказания услуги</h2>
      <p>
        Акцепт оферты — регистрация аккаунта и подтверждение email. Оплата после демо производится по реквизитам и
        контактам, указанным на странице оплаты; доступ активируется после проверки поступления средств Исполнителем.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-stone-900 dark:text-stone-100">5. Права и обязанности сторон</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Заказчик обязуется указывать достоверные данные и не нарушать законодательство РФ при использовании сервиса.</li>
        <li>Исполнитель обеспечивает работоспособность сервиса в разумных пределах, но не гарантирует бесперебойность при форс-мажоре и сбоях у провайдеров.</li>
        <li>Заказчик несёт ответственность за содержание публичной витрины и обработку персональных данных своих клиентов.</li>
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-stone-900 dark:text-stone-100">6. Контакты</h2>
      <p>
        По вопросам оплаты, доступа и договора:{" "}
        <a href={`mailto:${billingEmail}`} className="font-medium text-teal-800 underline dark:text-teal-300">
          {billingEmail}
        </a>
        , тел.{" "}
        <a href={`tel:${billingPhone.replace(/\s/g, "")}`} className="font-medium text-teal-800 underline dark:text-teal-300">
          {billingPhone}
        </a>
        .
      </p>

      <p className="mt-8 text-sm text-stone-500">
        Исполнитель вправе изменять оферту; новая редакция вступает в силу с момента публикации на этой странице.
      </p>
    </LegalDocLayout>
  );
}
