// Список всех зарегистрированных организаций для панели платформы
import { NextResponse } from "next/server";
import { listAllPlatformOrganizations } from "@/lib/billing-queue";
import { isPlatformAuthorized, platformUnauthorizedResponse } from "@/lib/platform-auth";

export async function GET(req: Request) {
  if (!(await isPlatformAuthorized(req))) {
    return platformUnauthorizedResponse();
  }

  const items = await listAllPlatformOrganizations();
  return NextResponse.json({ items, count: items.length });
}
