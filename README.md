This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Auth (production)

Переменные (см. также `.env.example`):

- `AUTH_SECRET` — шифрование сессий Auth.js.
- `DATABASE_URL` — PostgreSQL для Prisma.
- `AUTH_URL` — базовый URL приложения для ссылок в письмах (на dev используйте порт из `npm run dev`, например `http://localhost:3002`).
- `RESEND_API_KEY` + `EMAIL_FROM` — отправка писем подтверждения и сброса пароля через [Resend](https://resend.com).
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — общий rate limit между инстансами.

Поведение:

- Вход только по email/паролю после подтверждения почты; Google OAuth в коде отключён.
- Без `RESEND_API_KEY` ссылки из писем выводятся в консоль сервера (fallback для разработки).
- После смены пароля сессии инвалидируются (`sessionVersion`).
- Роли: владелец, участники `ADMIN` / `STAFF` (см. `/admin/team`), права на API по матрице в `src/lib/permissions.ts`.

Миграции БД после обновления:

```bash
npx prisma migrate deploy
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
