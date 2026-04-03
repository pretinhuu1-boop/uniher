#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/uniher"
BRANCH="${1:-main}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "Repositorio nao encontrado em $APP_DIR"
  exit 1
fi

cd "$APP_DIR"

echo "[1/6] Atualizando codigo..."
git fetch origin
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -fd

echo "[2/6] Instalando dependencias..."
npm ci --include=dev

if [ -f ".env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.production"
  set +a
fi

echo "[3/6] Garantindo pasta de dados..."
mkdir -p data backups

echo "[4/6] Build de producao..."
npm run build

echo "[4.1/6] Preparando standalone..."
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
rm -rf .next/standalone/public
cp -R public .next/standalone/public

echo "[5/6] Migracoes e seed base..."
npm run db:seed

echo "[6/6] Reiniciando app..."
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo "Deploy concluido."
