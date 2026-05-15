// Страница сброса пароля: Suspense из‑за useSearchParams при production build
import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8 text-sm text-stone-500">Загрузка…</div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
