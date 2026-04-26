// Один экземпляр PrismaClient: в production — singleton на global (ограничение пула соединений);
// в development — НЕ вешаем на global, иначе после npx prisma generate старый клиент без новых моделей
// остаётся в памяти (Cannot read 'deleteMany' of undefined на prisma.adHocDaySlot), пока не перезапустите dev.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const create = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

export const prisma: PrismaClient =
  process.env.NODE_ENV === "production" ? (globalForPrisma.prisma ??= create()) : create();
