// Отправка транзакционных писем: приоритет SMTP (Яндекс и др.), затем Resend, иначе лог в консоль (dev)
import nodemailer from "nodemailer";
import { z } from "zod";

const fromSchema = z.string().min(3);

// Базовый URL приложения для ссылок в письмах (подтверждение, сброс пароля)
function getAppBaseUrl(): string {
  const u = process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (u) return u.replace(/\/$/, "");
  return "http://localhost:3002";
}

export function appBaseUrl(): string {
  return getAppBaseUrl();
}

type SendParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

// Минимальный набор переменных для отправки через SMTP (типичный случай — Яндекс Почта)
function smtpConfigured(): boolean {
  const h = process.env.SMTP_HOST?.trim();
  const u = process.env.SMTP_USER?.trim();
  const p = process.env.SMTP_PASS?.trim();
  return Boolean(h && u && p);
}

// Разбор From для nodemailer: «Имя <email>» с кириллицей в имени — объект { name, address } надёжнее строки
function buildNodemailerFrom(): string | { name: string; address: string } {
  const raw = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER!.trim();
  const angle = /^(.+?)\s*<([^>]+)>$/.exec(raw);
  if (angle) {
    const name = angle[1].trim();
    const address = angle[2].trim();
    const ok = fromSchema.safeParse(address);
    if (!ok.success) {
      throw new Error("[email] SMTP: в угловых скобках должен быть валидный email");
    }
    return { name, address: ok.data };
  }
  const simple = fromSchema.safeParse(raw);
  if (!simple.success) {
    throw new Error("[email] SMTP: укажите валидный EMAIL_FROM или оставьте пустым — тогда возьмётся SMTP_USER");
  }
  return simple.data;
}

// Одно письмо через nodemailer: 465 — SSL; 587 — STARTTLS (как у smtp.yandex.ru)
async function sendViaSmtp(params: SendParams): Promise<void> {
  const host = process.env.SMTP_HOST!.trim();
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const port = Number(process.env.SMTP_PORT || "465") || 465;

  const fromField = buildNodemailerFrom();

  const secure = port === 465;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(!secure ? { requireTLS: true } : {}),
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: fromField,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

// Отправка через REST API Resend (если SMTP не настроен)
async function sendViaResend(params: SendParams, from: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY!;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.text,
      html: params.html,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Resend error: ${res.status} ${t}`);
  }
}

/**
 * Универсальная отправка: SMTP при заданных SMTP_HOST/SMTP_USER/SMTP_PASS,
 * иначе Resend при RESEND_API_KEY+EMAIL_FROM, иначе вывод в stdout.
 */
export async function sendTransactionalEmail(params: SendParams): Promise<void> {
  if (smtpConfigured()) {
    await sendViaSmtp(params);
    return;
  }

  const from = process.env.EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey && from) {
    const parsedFrom = fromSchema.safeParse(from);
    if (!parsedFrom.success) {
      console.warn("[email] EMAIL_FROM invalid, falling back to log");
    } else {
      await sendViaResend(params, parsedFrom.data);
      return;
    }
  }

  console.log(
    "[email:console-fallback] — задайте SMTP_HOST, SMTP_USER, SMTP_PASS (Яндекс) или RESEND_API_KEY и EMAIL_FROM\n",
    { to: params.to, subject: params.subject, text: params.text }
  );
}

// Ссылка подтверждения email в письме
export function buildVerifyEmailUrl(rawToken: string): string {
  return `${getAppBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
}

// Ссылка сброса пароля в письме
export function buildPasswordResetUrl(rawToken: string): string {
  return `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
}
