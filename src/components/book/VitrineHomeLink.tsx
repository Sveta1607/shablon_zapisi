// Ссылка с публичной витрины: авторизованный мастер идёт в панель, гость — на посадочную
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

type Props = {
  className?: string;
};

export function VitrineHomeLink({ className }: Props) {
  const { data: session } = useSession();
  const href = session?.user ? "/admin" : "/";
  const label = session?.user ? "В панель" : "На главную";

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
