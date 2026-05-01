// Раньше здесь подтверждали email по токену; сейчас верификация отключена
import { Suspense } from "react";
import { VerifyEmailContent } from "./verify-email-content";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8 text-sm text-stone-500">Загрузка…</div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
