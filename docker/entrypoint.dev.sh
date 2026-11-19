#!/bin/sh
# Entrypoint de desenvolvimento da API: gera o Prisma Client, aplica migrations,
# roda a seed idempotente e então executa o comando recebido (padrão: start:dev).
# Defina DB_SETUP=false para pular migrations/seed (ex.: rodar testes sem banco).
set -eu

PRISMA_CONFIG=prisma7.config.ts

echo "[entrypoint] Gerando Prisma Client..."
npx prisma generate --config "$PRISMA_CONFIG"

if [ "${DB_SETUP:-true}" = "true" ]; then
  echo "[entrypoint] Aplicando migrations..."
  npx prisma migrate deploy --config "$PRISMA_CONFIG"

  echo "[entrypoint] Executando seed idempotente..."
  npm run seed
fi

exec "$@"
