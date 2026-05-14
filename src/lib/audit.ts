// Запись событий безопасности в AuditLog для расследований
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  meta?: Prisma.InputJsonValue;
  ip?: string | null;
};

/** Пишем неблокирующе: ошибка логирования не должна ломать основной запрос */
export async function writeAuditLog(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? undefined,
        organizationId: input.organizationId ?? undefined,
        action: input.action,
        meta: input.meta === undefined ? undefined : input.meta,
        ip: input.ip ?? undefined,
      },
    });
  } catch {
    // намеренно глотаем: логирование вторично
  }
}
