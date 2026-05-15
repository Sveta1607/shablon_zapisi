// Очередь организаций с истёкшим демо
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformQueueClient } from "@/components/platform/PlatformQueueClient";
import { PlatformQueueHeader } from "@/components/platform/PlatformQueueHeader";
import { isPlatformAdminSession } from "@/lib/platform-auth";

export const dynamic = "force-dynamic";

export default async function PlatformQueuePage() {
  if (!(await isPlatformAdminSession())) {
    redirect("/platform/login?reason=session");
  }

  return (
    <div className="min-h-full bg-stone-100/90 px-4 py-10 dark:bg-stone-950">
      <div className="mx-auto max-w-2xl">
        <PlatformQueueHeader />
        <PlatformQueueClient />
        <p className="mt-8 text-center">
          <Link href="/" className="text-sm text-stone-500 hover:underline">
            На сайт
          </Link>
        </p>
      </div>
    </div>
  );
}
