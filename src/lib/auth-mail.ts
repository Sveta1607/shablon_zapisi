// Отправка сервисных писем auth: в dev логируем ссылку, в прод можно подключить SMTP/API провайдера
import { Resend } from "resend";

type AuthMailKind = "verify-email" | "reset-password";

// Формирует публичный base URL для ссылок из письма (Vercel/локалка)
function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (explicit && explicit.trim().length > 0) return explicit.trim().replace(/\/+$/, "");
  return "http://localhost:3002";
}

// Resend-клиент и адрес отправителя читаются из env, чтобы production-отправка на Vercel работала без hardcode
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.AUTH_FROM_EMAIL || "noreply@example.com";

// Унифицированная отправка ссылок: возвращает флаг доставки, чтобы API мог корректно сообщать результат
export async function sendAuthActionLink(params: {
  to: string;
  kind: AuthMailKind;
  token: string;
}): Promise<{ delivered: boolean }> {
  const baseUrl = resolveBaseUrl();
  const url =
    params.kind === "verify-email"
      ? `${baseUrl}/verify-email?token=${encodeURIComponent(params.token)}`
      : `${baseUrl}/reset-password?token=${encodeURIComponent(params.token)}`;

  const subject = params.kind === "verify-email" ? "Подтверждение email" : "Сброс пароля";
  const actionText =
    params.kind === "verify-email"
      ? "Подтвердите email, чтобы завершить регистрацию"
      : "Перейдите по ссылке, чтобы задать новый пароль";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111;">
      <h2 style="margin-bottom:12px;">${subject}</h2>
      <p>${actionText}:</p>
      <p><a href="${url}" style="color:#0d9488;">${url}</a></p>
      <p style="color:#666; font-size:12px;">Если вы не запрашивали это действие, просто проигнорируйте письмо.</p>
    </div>
  `;

  // Если Resend сконфигурирован, пытаемся отправить письмо в любом окружении (dev/prod)
  if (resend) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: [params.to],
        subject,
        html,
      });
      return { delivered: true };
    } catch (error) {
      // Ошибка почтового провайдера не должна ломать регистрацию: оставляем fallback-ссылку в логах
      console.error("[auth-mail] resend failed:", error);
    }
  }

  // Лог нужен как fallback: если Resend не настроен или вернул ошибку, ссылку можно взять из сервера
  console.info(`[auth-mail] ${params.kind} -> ${params.to}: ${url}`);
  return { delivered: false };
}
