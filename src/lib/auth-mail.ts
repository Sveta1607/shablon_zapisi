// Отправка сервисных писем auth: в dev логируем ссылку, в прод можно подключить SMTP/API провайдера
type AuthMailKind = "verify-email" | "reset-password";

// Формирует публичный base URL для ссылок из письма (Vercel/локалка)
function resolveBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  if (explicit && explicit.trim().length > 0) return explicit.trim().replace(/\/+$/, "");
  return "http://localhost:3002";
}

// Унифицированная отправка ссылок: сейчас безопасно логирует, чтобы флоу работал без внешнего почтового сервиса
export async function sendAuthActionLink(params: { to: string; kind: AuthMailKind; token: string }) {
  const baseUrl = resolveBaseUrl();
  const url =
    params.kind === "verify-email"
      ? `${baseUrl}/verify-email?token=${encodeURIComponent(params.token)}`
      : `${baseUrl}/reset-password?token=${encodeURIComponent(params.token)}`;

  // Лог нужен как dev-fallback до подключения реального провайдера email на проде
  console.info(`[auth-mail] ${params.kind} -> ${params.to}: ${url}`);
}
