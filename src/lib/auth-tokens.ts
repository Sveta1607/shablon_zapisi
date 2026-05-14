// Создание одноразовых токенов в БД и отправка писем подтверждения/сброса
import { AuthTokenPurpose } from "@prisma/client";
import { createRawTokenAndHash, PASSWORD_RESET_TOKEN_MS, VERIFY_EMAIL_TOKEN_MS } from "@/lib/auth-security";
import { buildPasswordResetUrl, buildVerifyEmailUrl, sendTransactionalEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/** Удаляет старые токены того же назначения и создаёт новый; возвращает raw (только для dev, не логируем) */
export async function issueEmailVerificationToken(userId: string, email: string): Promise<void> {
  await prisma.authEmailToken.deleteMany({
    where: { userId, purpose: AuthTokenPurpose.VERIFY_EMAIL },
  });
  const { rawToken, tokenHash } = createRawTokenAndHash();
  const expiresAt = new Date(Date.now() + VERIFY_EMAIL_TOKEN_MS);
  await prisma.authEmailToken.create({
    data: { userId, tokenHash, purpose: AuthTokenPurpose.VERIFY_EMAIL, expiresAt },
  });
  const link = buildVerifyEmailUrl(rawToken);
  await sendTransactionalEmail({
    to: email,
    subject: "Подтвердите email",
    text: `Перейдите по ссылке для подтверждения: ${link}\nСсылка действует 24 часа.`,
    html: `<p>Подтвердите email, перейдя по <a href="${link}">ссылке</a>.</p><p>Ссылка действует 24 часа.</p>`,
  });
}

/** Токен сброса пароля: при смене инкрементируйте user.sessionVersion в вызывающем коде */
export async function issuePasswordResetToken(userId: string, email: string): Promise<void> {
  await prisma.authEmailToken.deleteMany({
    where: { userId, purpose: AuthTokenPurpose.PASSWORD_RESET },
  });
  const { rawToken, tokenHash } = createRawTokenAndHash();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_MS);
  await prisma.authEmailToken.create({
    data: { userId, tokenHash, purpose: AuthTokenPurpose.PASSWORD_RESET, expiresAt },
  });
  const link = buildPasswordResetUrl(rawToken);
  await sendTransactionalEmail({
    to: email,
    subject: "Сброс пароля",
    text: `Сброс пароля: ${link}\nЕсли вы не запрашивали сброс, проигнорируйте письмо. Ссылка действует 1 час.`,
    html: `<p><a href="${link}">Установить новый пароль</a></p><p>Если вы не запрашивали сброс, проигнорируйте письмо. Срок — 1 час.</p>`,
  });
}
