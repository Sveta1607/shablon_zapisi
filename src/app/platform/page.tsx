// Редирект на очередь или вход в панель платформы
import { redirect } from "next/navigation";
import { isPlatformAdminSession } from "@/lib/platform-auth";

export default async function PlatformIndexPage() {
  if (await isPlatformAdminSession()) {
    redirect("/platform/queue");
  }
  redirect("/platform/login");
}
