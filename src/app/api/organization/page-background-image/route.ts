// Фон витрины: загрузка картинки в public/uploads/orgs, имя {orgId}-pagebg{ext}
import { Buffer } from "node:buffer";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { resolveExtensionForImageUpload } from "@/lib/image-upload-helpers";
import { mergeOrgWithBackground, readOrgBackgroundFromDb } from "@/lib/org-background-db";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 2 * 1024 * 1024;
const UPLOADS_ORGS = join(process.cwd(), "public", "uploads", "orgs");

export async function POST(req: Request) {
  const ctx = await requireOrganization({ permission: "organization_settings" });
  if (!ctx) return NextResponse.json({ error: "Нет доступа" }, { status: 401 });
  const s = rejectIfOrganizationSuspended(ctx.organization);
  if (s) return s;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Выберите файл (поле file)" }, { status: 400 });
  }
  if (file.size < 1) {
    return NextResponse.json({ error: "Пустой файл" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Файл больше 2 МБ" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const resolved = resolveExtensionForImageUpload(file, buffer, false);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const { ext } = resolved;

  const orgId = ctx.organization.id;
  const fileName = `${orgId}-pagebg${ext}`;

  try {
    await mkdir(UPLOADS_ORGS, { recursive: true });

    const oldUrl = ctx.organization.pageBackgroundImageUrl;
    if (oldUrl?.startsWith("/uploads/orgs/") && !oldUrl.includes("..")) {
      const oldName = oldUrl.replace("/uploads/orgs/", "").replace(/^\/+/, "");
      if (oldName && oldName !== fileName) {
        try {
          await unlink(join(UPLOADS_ORGS, oldName));
        } catch {
          /* no file */
        }
      }
    }

    const absPath = join(UPLOADS_ORGS, fileName);
    await writeFile(absPath, buffer);
  } catch (e) {
    console.error("[page-background-image write]", e);
    return NextResponse.json(
      {
        error:
          "Не удалось сохранить файл. Проверьте, что папка public/uploads доступна для записи. При OneDrive вынесите проект в обычный каталог на диске.",
      },
      { status: 500 }
    );
  }

  const publicPath = `/uploads/orgs/${fileName}`;
  try {
    // Старый prisma generate без pageBackgroundImageUrl в клиенте — update() падает; пишем через SQL
    await prisma.$executeRaw`UPDATE "Organization" SET "pageBackgroundImageUrl" = ${publicPath} WHERE "id" = ${orgId}`;
    const row = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!row) {
      return NextResponse.json({ error: "Организация не найдена" }, { status: 500 });
    }
    const bg = await readOrgBackgroundFromDb(orgId);
    return NextResponse.json(mergeOrgWithBackground(row, bg));
  } catch (e) {
    console.error("[page-background-image db]", e);
    return NextResponse.json(
      { error: "Ошибка базы. Проверьте миграции Prisma к Supabase и перезапустите сервер." },
      { status: 500 }
    );
  }
}
