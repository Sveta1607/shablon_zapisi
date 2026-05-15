// Контакты для оплаты на экране окончания демо: копирование почты и телефона в буфер
"use client";

import { useState } from "react";

const DEFAULT_EMAIL = "Sharunkina2014@yandex.ru";
const DEFAULT_PHONE = "+79518653906";

type CopyRowProps = {
  label: string;
  value: string;
  href: string;
};

function CopyContactRow({ label, value, href }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-left dark:border-stone-600 dark:bg-stone-800/50">
      <span className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <a
          href={href}
          className="min-w-0 break-all text-sm font-medium text-teal-800 hover:underline dark:text-teal-300"
        >
          {value}
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              window.prompt(`Скопируйте ${label.toLowerCase()}:`, value);
            }
          }}
          className="shrink-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
    </div>
  );
}

type Props = {
  email?: string;
  phone?: string;
};

export function DemoExpiredContacts({ email, phone }: Props) {
  const billingEmail = email?.trim() || DEFAULT_EMAIL;
  const billingPhone = phone?.trim() || DEFAULT_PHONE;
  const phoneDigits = billingPhone.replace(/\D/g, "");
  const telHref = phoneDigits.startsWith("7") ? `tel:+${phoneDigits}` : `tel:${billingPhone}`;

  return (
    <div className="mt-4 space-y-2 text-left">
      <p className="text-center text-sm font-medium text-stone-800 dark:text-stone-200">Свяжитесь для оплаты</p>
      <CopyContactRow label="Почта" value={billingEmail} href={`mailto:${billingEmail}`} />
      <CopyContactRow label="Телефон" value={billingPhone} href={telHref} />
      <p className="pt-1 text-center text-xs text-stone-500">
        В сообщении укажите email, с которым регистрировались — мы отметим оплату и включим доступ.
      </p>
    </div>
  );
}
