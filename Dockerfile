# syntax=docker/dockerfile:1

# Этап зависимостей: ставим npm-пакеты для сборки Next.js и Prisma
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Этап сборки: компилируем приложение и генерируем Prisma Client
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# Runtime-этап: минимальный образ для запуска в Amvera
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Копируем только то, что нужно для запуска и миграций
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3002

# Перед стартом применяем миграции, чтобы схема БД была актуальна
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start -p 3002"]
