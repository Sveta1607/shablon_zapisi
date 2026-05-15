// Вход в панель платформы: секрет из .env → httpOnly cookie
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearPlatformAdminCookie,
  getPlatformAdminSecret,
  setPlatformAdminCookie,
} from "@/lib/platform-auth";

const bodySchema = z.object({ secret: z.string().min(1) });

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите секрет" }, { status: 400 });
  }

  const expected = getPlatformAdminSecret();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "PLATFORM_ADMIN_SECRET не задан на сервере. Локально — в .env; на Amvera — в переменных окружения проекта.",
      },
      { status: 503 }
    );
  }
  const given = parsed.data.secret.trim();
  if (given !== expected) {
    return NextResponse.json(
      { error: "Неверный секрет. Сверьте с PLATFORM_ADMIN_SECRET в .env или в панели Amvera (без пробелов)." },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  setPlatformAdminCookie(res);
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearPlatformAdminCookie(res);
  return res;
}
