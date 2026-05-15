#!/bin/sh
# DB migrations, then Next.js standalone server
set -e
cd /app

prisma_cli() {
  if [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma "$@"
  elif [ -f ./node_modules/prisma/build/index.js ]; then
    node ./node_modules/prisma/build/index.js "$@"
  else
    echo "[entrypoint] ERROR: Prisma CLI not found in image"
    exit 1
  fi
}

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] prisma migrate deploy..."
  if ! prisma_cli migrate deploy 2>&1 | tee /tmp/prisma-migrate.log; then
    # БД уже обновляли через db push — снимаем failed/applied для billing-миграции
    if grep -qE "billing_demo_access|BillingReviewStatus|P3009|P3018" /tmp/prisma-migrate.log; then
      echo "[entrypoint] billing migration: mark as applied and retry..."
      prisma_cli migrate resolve --applied 20260515120000_billing_demo_access
      prisma_cli migrate deploy
    else
      cat /tmp/prisma-migrate.log
      exit 1
    fi
  fi
fi

echo "[entrypoint] starting Next.js on port ${PORT:-3002}..."
exec node server.js
