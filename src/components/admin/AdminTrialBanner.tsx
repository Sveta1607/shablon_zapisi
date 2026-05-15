// Баннер в панели: напоминание об оставшихся днях демо (после покупки не показываем)
import type { Organization } from "@prisma/client";
import { BillingPaymentLink } from "@/components/billing/BillingPaymentLink";
import { getDemoDaysRemaining, getOrganizationAccessPhase } from "@/lib/org-access";

type Props = {
  organization: Organization;
};

export function AdminTrialBanner({ organization }: Props) {
  const phase = getOrganizationAccessPhase(organization);
  if (phase !== "trial") return null;

  const daysLeft = getDemoDaysRemaining(organization);
  const dayWord = daysLeft === 1 ? "день" : daysLeft >= 2 && daysLeft <= 4 ? "дня" : "дней";

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-sm text-amber-950 sm:mb-6 sm:px-4 sm:py-3 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="font-medium">Бесплатное демо</p>
      <p className="mt-0.5 text-amber-900/90 dark:text-amber-200/90">
        {daysLeft > 0 ? (
          <>
            Осталось {daysLeft} {dayWord} с момента регистрации. После окончания демо понадобится оплатить услугу — ваши
            данные сохранятся.{" "}
            <BillingPaymentLink
              label="Оплата и тариф"
              className="font-medium text-teal-900 underline underline-offset-2 hover:text-teal-700 dark:text-teal-200 dark:hover:text-teal-100"
            />
            .
          </>
        ) : (
          <>
            Демо заканчивается сегодня. После этого откроется экран с инструкцией по оплате — данные в панели сохранятся.{" "}
            <BillingPaymentLink
              label="Оплата и тариф"
              className="font-medium text-teal-900 underline underline-offset-2 hover:text-teal-700 dark:text-teal-200 dark:hover:text-teal-100"
            />
            .
          </>
        )}
      </p>
    </div>
  );
}
