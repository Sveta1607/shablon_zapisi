// Список организаций с истёкшим демо в очереди платформы
import { NextResponse } from "next/server";
import { listBillingQueue } from "@/lib/billing-queue";
import { isPlatformAuthorized, platformUnauthorizedResponse } from "@/lib/platform-auth";

export async function GET(req: Request) {
  if (!(await isPlatformAuthorized(req))) {
    return platformUnauthorizedResponse();
  }

  const items = await listBillingQueue();
  return NextResponse.json({ items, count: items.length });
}
