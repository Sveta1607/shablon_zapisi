#!/bin/sh
# Перед стартом: миграции БД, затем Next.js standalone
set -e
cd /app

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] prisma migrate deploy..."
  npx prisma migrate deploy
fi

echo "[entrypoint] starting Next.js on port ${PORT:-3002}..."
exec node server.js
