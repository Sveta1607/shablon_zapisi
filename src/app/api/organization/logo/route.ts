// Загрузка логотипа с диска: файл в public/uploads/orgs, в БД — относительный путь
import { Buffer } from "node:buffer";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { rejectIfOrganizationSuspended, requireOrganization } from "@/lib/auth-helpers";
import { resolveExtensionForImageUpload } from "@/lib/image-upload-helpers";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 2 * 1024 * 1024;
const UPLOADS_ORGS = join(process.cwd(), "public", "uploads", "orgs");

export async function POST(req: Request) {
  const ctx = await requireOrganization();
  if (!ctx) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
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

  const buf = Buffer.from(await file.arrayBuffer());
  const resolved = resolveExtensionForImageUpload(file, buf, true);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const { ext } = resolved;

  const orgId = ctx.organization.id;
  const fileName = `${orgId}${ext}`;

  try {
    await mkdir(UPLOADS_ORGS, { recursive: true });
    const absPath = join(UPLOADS_ORGS, fileName);

    const oldUrl = ctx.organization.logoUrl;
    if (oldUrl?.startsWith("/uploads/orgs/")) {
      const oldName = oldUrl.replace("/uploads/orgs/", "").replace(/^\/+/, "");
      if (oldName && oldName !== fileName && !oldName.includes("..")) {
        const oldPath = join(UPLOADS_ORGS, oldName);
        try {
          await unlink(oldPath);
        } catch {
          /* файла нет */
        }
      }
    }

    await writeFile(absPath, buf);
  } catch (e) {
    console.error("[logo write]", e);
    return NextResponse.json(
      {
        error:
          "Не удалось сохранить файл. Проверьте папку public/uploads. При OneDrive вынесите проект в обычный каталог на диске.",
      },
      { status: 500 }
    );
  }

  const publicPath = `/uploads/orgs/${fileName}`;
  try {
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { logoUrl: publicPath },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[logo db]", e);
    return NextResponse.json(
      { error: "Ошибка базы. Выполните npx prisma db push в папке saas и перезапустите сервер." },
      { status: 500 }
    );
  }
}
