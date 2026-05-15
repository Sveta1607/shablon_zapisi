#!/bin/sh
# DB migrations, then Next.js standalone server
set -e
cd /app

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] prisma migrate deploy..."
  if [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma migrate deploy
  elif [ -f ./node_modules/prisma/build/index.js ]; then
    node ./node_modules/prisma/build/index.js migrate deploy
  else
    echo "[entrypoint] ERROR: Prisma CLI not found in image"
    exit 1
  fi
fi

echo "[entrypoint] starting Next.js on port ${PORT:-3002}..."
exec node server.js
