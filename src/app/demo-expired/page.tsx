// Экран после 14 дней демо: данные сохранены, нужна оплата услуги (включаете вручную после оплаты)
import Link from "next/link";

const billingContact =
  process.env.NEXT_PUBLIC_BILLING_CONTACT?.trim() ||
  process.env.BILLING_CONTACT?.trim() ||
  "свяжитесь с поддержкой по контактам, указанным при регистрации сервиса";

export default function DemoExpiredPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-stone-100/90 px-4 py-16 dark:bg-stone-950">
      <div className="max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-md dark:border-stone-700 dark:bg-stone-900">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Демо-период закончился</h1>
        <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
          14 дней бесплатного доступа с момента регистрации истекли. Ваши услуги, расписание и записи в базе
          сохранены — после оплаты услуги доступ к панели и витрине откроется снова.
        </p>
        <p className="mt-4 text-sm font-medium text-stone-800 dark:text-stone-200">Как оплатить</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{billingContact}</p>
        <p className="mt-4 text-xs text-stone-500">
          Укажите email, с которым регистрировались — мы отметим оплату и включим доступ.
        </p>
        <p className="mt-6">
          <Link href="/login" className="text-sm font-medium text-teal-800 hover:underline dark:text-teal-300">
            Войти в другой аккаунт
          </Link>
        </p>
      </div>
    </div>
  );
}
