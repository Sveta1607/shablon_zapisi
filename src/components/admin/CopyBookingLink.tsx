// Кнопка копирования публичной ссылки записи в буфер обмена
"use client";

import { useState } from "react";

type Props = { slug: string };

export function CopyBookingLink({ slug }: Props) {
  const [done, setDone] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/book/${slug}` : `/book/${slug}`;

  return (
    <button
      type="button"
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Скопируйте ссылку:", url);
        }
      }}
    >
      {done ? "Скопировано!" : "Скопировать ссылку на запись"}
    </button>
  );
}
