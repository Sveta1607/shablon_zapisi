// Ссылка с витрины только для владельца под сессией; гостям по ссылке мастера не показываем
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

type Props = {
  className?: string;
};

export function VitrineHomeLink({ className }: Props) {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <p className="mt-8 text-center text-xs text-stone-400">
      <Link href="/admin" className={className}>
        В панель
      </Link>
    </p>
  );
}
