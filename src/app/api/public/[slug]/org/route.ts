// Публичные данные витрины: без авторизации, только активные услуги и оформление
import { NextResponse } from "next/server";
import { applyVitrineBackground, readOrgBackgroundFromDb } from "@/lib/org-background-db";
import { prisma } from "@/lib/prisma";
import { isPublicBookingAllowed } from "@/lib/org-access";
import { getOrganizationAccessRecord } from "@/lib/org-access-db";

const NOT_FOUND_MSG = "Витрина не найдена. Проверьте ссылку (после /book/ должен быть ваш адрес из панели).";

// Select без pageBackground* — иначе устаревший @prisma/client молчит/падает, а в БД фон уже задан
const orgSelectForPublic = {
  id: true,
  slug: true,
  businessName: true,
  description: true,
  phone: true,
  emailContact: true,
  timezone: true,
  slotStepMinutes: true,
  accentColor: true,
  logoUrl: true,
  suspended: true,
  publicBookingEnabled: true,
  createdAt: true,
  services: {
    where: { active: true },
    orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }],
    select: {
      id: true,
      name: true,
      durationMinutes: true,
      priceCents: true,
    },
  },
};

/** Ответ /api/public/.../org */
type VitrineOrgPayload = {
  id: string;
  slug: string;
  businessName: string;
  description: string;
  phone: string;
  emailContact: string;
  timezone: string;
  slotStepMinutes: number;
  accentColor: string;
  pageBackgroundColor: string;
  pageBackgroundImageUrl: string | null;
  logoUrl: string | null;
  suspended: boolean;
  publicBookingEnabled: boolean;
  services: { id: string; name: string; durationMinutes: number; priceCents: number | null }[];
};

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!slug || slug.trim() === "") {
    return NextResponse.json({ error: "Не указан адрес витрины" }, { status: 400 });
  }

  try {
    const row = await prisma.organization.findUnique({
      where: { slug },
      select: orgSelectForPublic,
    });
    if (!row) {
      return NextResponse.json({ error: NOT_FOUND_MSG }, { status: 404 });
    }
    if (row.suspended) {
      return NextResponse.json({ error: NOT_FOUND_MSG }, { status: 404 });
    }

    // Фон только из raw SQL: совпадает с тем, что пишет админка при «битом» prisma generate
    const bg = await readOrgBackgroundFromDb(row.id);
    const org = applyVitrineBackground(row, bg) as unknown as VitrineOrgPayload;

    const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };
    const access = await getOrganizationAccessRecord(row);
    if (!isPublicBookingAllowed(access)) {
      return NextResponse.json({ ...org, services: [], publicBookingEnabled: false }, noStore);
    }
    if (!org.publicBookingEnabled) {
      return NextResponse.json({ ...org, services: [] }, noStore);
    }
    return NextResponse.json(org, noStore);
  } catch (e) {
    console.error("[public/org]", e);
    const isEngine =
      e instanceof Error && /query_engine|Failed to load|libssl|PrismaClientInitializationError/i.test(e.message + String(e));
    const engineHint = isEngine
      ? " Остановите dev-сервер, закройте процессы Node, затем в папке saas: npx prisma generate (при EPERM вынесите проект из OneDrive или снимите блокировку с папки node_modules/.prisma)."
      : "";
    return NextResponse.json(
      {
        error:
          "Ошибка сервера при загрузке витрины. Выполните npx prisma db push и npx prisma generate, перезапустите сервер." +
          engineHint,
      },
      { status: 500 }
    );
  }
}
