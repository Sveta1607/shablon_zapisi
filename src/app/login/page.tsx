// Страница входа: Suspense вокруг формы из‑за useSearchParams в Next.js 16
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center p-8 text-sm text-stone-500">Загрузка…</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
