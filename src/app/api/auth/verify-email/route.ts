// Подтверждение email по одноразовому токену из письма
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth-security";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();
  // Проверка наличия токена защищает endpoint от пустых запросов и шумовых переходов
  if (!token) {
    return NextResponse.json({ error: "Токен подтверждения не указан." }, { status: 400 });
  }
  const tokenHash = hashToken(token);
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  // Единый ответ на невалидный токен не раскрывает внутренние детали и сохраняет простой UX
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.json({ error: "Ссылка подтверждения недействительна или устарела." }, { status: 400 });
  }
  // Атомарно отмечаем email подтвержденным и гасим токен, чтобы исключить повторное использование
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: row.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await tx.emailVerificationToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
  });
  return NextResponse.json({ ok: true });
}
