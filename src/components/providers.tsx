// Оборачивает приложение в SessionProvider — нужен для signOut и useSession на клиенте
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
