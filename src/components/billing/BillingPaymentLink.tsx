// Ссылка на страницу оплаты с актуальной суммой
import Link from "next/link";
import { formatServicePriceRub } from "@/lib/billing-public";

type Props = {
  className?: string;
  /** Свой текст ссылки (например «Оплата и тариф» в баннере демо) */
  label?: string;
  /** false — без суммы в тексте по умолчанию */
  showPrice?: boolean;
};

export function BillingPaymentLink({ className, label, showPrice = true }: Props) {
  const text =
    label ?? (showPrice ? `Условия оплаты (${formatServicePriceRub()})` : "Условия оплаты");

  return (
    <Link href="/payment" className={className}>
      {text}
    </Link>
  );
}
