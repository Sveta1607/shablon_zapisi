// Чтение и обновление карточки организации (профиль, внешний вид, правила записи)
import { unlink } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { mergeOrgWithBackground, readOrgBackgroundFromDb } from "@/lib/org-background-db";
import { prisma } from "@/lib/prisma";

// Папка с файлами витрины (логотип, фон)
const UPLOADS_ORGS_DIR = join(process.cwd(), "public", "uploads", "orgs");

// Картинка: http(s)://… или /uploads/orgs/… — без z.string().url(): в Zod 4 он жёстче и режет валидные ссылки/порты/пуникод
const refImage = z
  .string()
  .max(500)
  .refine(
    (s) => {
      const t = s.trim();
      if (t === "") return true;
      if (t.startsWith("/uploads/orgs/") && !t.includes("..")) return true;
      try {
        const u = new URL(t);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Некорректный URL (http/https или путь /uploads/orgs/…)" }
  );

// JSON подставляет null для Number(NaN); в Zod 4 null не пропускает .optional() — превращаем в «поле не менять»
const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === null || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
    z.number().int().min(min).max(max).optional()
  );

const patchSchema = z.object({
  businessName: z.string().min(1).max(120).optional(),
  description: z.string().max(4000).optional(),
  phone: z.string().max(40).optional(),
  emailContact: z.string().max(120).optional(),
  timezone: z.string().min(1).max(80).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  pageBackgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  pageBackgroundImageUrl: z.union([z.null(), refImage]).optional(),
  logoUrl: z.union([z.null(), refImage]).optional(),
  minAdvanceHours: optionalInt(0, 168),
  slotStepMinutes: optionalInt(5, 120),
  publicBookingEnabled: z.boolean().optional(),
});

/** Сжимаем пробелы в ссылках; пустая строка → null, чтобы картинки оставались по желанию */
function normalizeOrgPatchJson(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }
  const o = { ...raw } as Record<string, unknown>;
  for (const key of ["pageBackgroundImageUrl", "logoUrl"] as const) {
    const v = o[key];
    if (v === null || v === undefined) {
      continue;
    }
    if (typeof v === "string" && v.trim() === "") {
      o[key] = null;
      continue;
    }
    if (typeof v === "string") {
      o[key] = v.trim();
    }
  }
  // Пустая строка при min(1) в Zod ломает PATCH; пусто = не обновлять поле
  if (o.businessName === "") {
    delete o.businessName;
  }
  if (o.timezone === "") {
    delete o.timezone;
  }
  return o;
}

/** Расшифровка сбоя Prisma/SQLite для ответа клиенту (без общих фраз «перезапустите сервер») */
function formatPrismaSaveError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021" || e.code === "P2022") {
      return `в таблице нет колонки из схемы (${e.code}). В папке saas: npx prisma db push, затем перезапуск dev`;
    }
    return `${e.code}: ${e.message}`;
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    return e.message;
  }
  if (e instanceof Error) {
    const m = e.message;
    if (/Unknown argument|pageBackgroundColor/i.test(m)) {
      return `${m} (если в тексте «Unknown argument pageBackground*», выполните: остановить dev, удалить saas\\node_modules\\.prisma, npx prisma generate; при EPERM вынесите проект с OneDrive)`;
    }
    if (/readonly|SQLITE_READONLY|locked|SQLITE_BUSY|EPERM|no such column/i.test(m)) {
      return `${m} — закройте Prisma Studio; при no such column: npx prisma db push в saas. OneDrive: вынесите проект из синхронизации`;
    }
    return m;
  }
  return String(e);
}

export async function GET() {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organization.id },
    include: {
      _count: { select: { services: true, bookings: true } },
    },
  });
  if (!org) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }
  const bg = await readOrgBackgroundFromDb(org.id);
  return NextResponse.json(mergeOrgWithBackground(org, bg));
}

export async function PATCH(req: Request) {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  const sus = rejectIfOrganizationSuspended(ctx.organization);
  if (sus) return sus;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(normalizeOrgPatchJson(json));
  if (!parsed.success) {
    const iss = parsed.error.issues[0];
    const human = iss
      ? `${[...(iss.path ?? [])].map(String).join(".") || "form"}: ${iss.message}`
      : "Неверные данные";
    // в ответе только простые данные: format() в Zod 4 иногда даёт вложенности, плохо сериализуемые в edge
    return NextResponse.json(
      {
        error: human,
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
      },
      { status: 400 }
    );
  }
  const payload = { ...parsed.data };
  if (payload.logoUrl === "") payload.logoUrl = null;
  if (payload.pageBackgroundImageUrl === "") payload.pageBackgroundImageUrl = null;

  // Prisma не принимает `undefined` в data — оставляем только заданные поля; `null` для опциональных URL оставляем
  const data = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нет полей для сохранения (все значения пустые)" }, { status: 400 });
  }

  const oldLogoUrl = ctx.organization.logoUrl;
  const oldLogoFile =
    oldLogoUrl?.startsWith("/uploads/orgs/") && !oldLogoUrl.includes("..")
      ? oldLogoUrl.replace("/uploads/orgs/", "").replace(/^\/+/, "")
      : null;

  const oldPageImgUrl = ctx.organization.pageBackgroundImageUrl;
  const oldPageFile =
    oldPageImgUrl?.startsWith("/uploads/orgs/") && !oldPageImgUrl.includes("..")
      ? oldPageImgUrl.replace("/uploads/orgs/", "").replace(/^\/+/, "")
      : null;

  // Поля pageBackground* добавлены в схему позже: при неудачном prisma generate (часто EPERM на OneDrive) рантайм-клиент без них.
  // Остальные поля — через Prisma; фон — через $executeRaw к таблице "Organization" (колонки после db push уже в SQLite).
  const { pageBackgroundColor: pbc, pageBackgroundImageUrl: pbi, ...rest } = data;
  const hasRest = Object.keys(rest).length > 0;
  const hasBg = pbc !== undefined || pbi !== undefined;
  const orgId = ctx.organization.id;

  let updated: NonNullable<Awaited<ReturnType<typeof prisma.organization.findUnique>>>;
  try {
    await prisma.$transaction(async (tx) => {
      if (hasRest) {
        await tx.organization.update({ where: { id: orgId }, data: rest as Prisma.OrganizationUpdateInput });
      }
      if (pbc !== undefined && pbi !== undefined) {
        await tx.$executeRaw`UPDATE "Organization" SET "pageBackgroundColor" = ${pbc as string}, "pageBackgroundImageUrl" = ${
          pbi as string | null
        } WHERE "id" = ${orgId}`;
      } else if (pbc !== undefined) {
        await tx.$executeRaw`UPDATE "Organization" SET "pageBackgroundColor" = ${pbc as string} WHERE "id" = ${orgId}`;
      } else if (pbi !== undefined) {
        await tx.$executeRaw`UPDATE "Organization" SET "pageBackgroundImageUrl" = ${pbi as string | null} WHERE "id" = ${orgId}`;
      }
    });
    const row = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!row) {
      return NextResponse.json({ error: "Запись организации не найдена" }, { status: 500 });
    }
    const bgRow = await readOrgBackgroundFromDb(orgId);
    updated = mergeOrgWithBackground(row, bgRow) as typeof row;
  } catch (e) {
    console.error("[PATCH /api/organization]", e);
    const detail = formatPrismaSaveError(e);
    return NextResponse.json({ error: `Сохранение: ${detail}` }, { status: 500 });
  }

  if (oldLogoFile && updated.logoUrl !== oldLogoUrl) {
    try {
      await unlink(join(UPLOADS_ORGS_DIR, oldLogoFile));
    } catch {
      /* нет файла */
    }
  }
  if (oldPageFile && updated.pageBackgroundImageUrl !== oldPageImgUrl) {
    try {
      await unlink(join(UPLOADS_ORGS_DIR, oldPageFile));
    } catch {
      /* нет файла */
    }
  }

  return NextResponse.json(updated);
}
