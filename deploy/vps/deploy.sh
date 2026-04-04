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

ALLOW_HTTP_TESTING="${UNIHER_ALLOW_HTTP_TESTING:-false}"
APP_URL="${NEXT_PUBLIC_APP_URL:-}"
ALLOW_INSECURE_COOKIES="${ALLOW_INSECURE_HTTP_COOKIES:-false}"

if [ "$ALLOW_HTTP_TESTING" != "true" ]; then
  if [[ ! "$APP_URL" =~ ^https:// ]]; then
    echo "NEXT_PUBLIC_APP_URL precisa usar https em producao."
    echo "Se for um teste temporario em HTTP, rode com UNIHER_ALLOW_HTTP_TESTING=true."
    exit 1
  fi

  if [ "$ALLOW_INSECURE_COOKIES" = "true" ]; then
    echo "ALLOW_INSECURE_HTTP_COOKIES=true nao e permitido em deploy seguro."
    echo "Se for um teste temporario em HTTP, rode com UNIHER_ALLOW_HTTP_TESTING=true."
    exit 1
  fi
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

echo "[6.1/6] Aguardando app responder..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "App online."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "App nao respondeu a tempo."
    exit 1
  fi
  sleep 1
done

echo "Deploy concluido."
