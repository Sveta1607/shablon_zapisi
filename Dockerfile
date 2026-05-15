# syntax=docker/dockerfile:1
# Production-˜˜˜˜˜: Next.js standalone + Prisma migrate ˜˜˜ ˜˜˜˜˜˜ (Amvera / Docker Compose)

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall ˜˜˜˜˜˜˜˜ prisma generate ˜˜ ˜˜˜˜˜˜˜˜˜˜˜ schema ˜ ˜˜˜˜˜˜˜˜˜ ˜˜ ˜˜˜˜ ˜˜˜˜˜
RUN npm ci --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npx next build --webpack

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

# Prisma CLI ˜ ˜˜˜˜˜˜˜˜˜˜˜˜˜˜˜ ˜˜˜˜˜˜ ˜ ˜˜˜ migrate deploy ˜ runtime
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3002').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/docker-entrypoint.sh"]
