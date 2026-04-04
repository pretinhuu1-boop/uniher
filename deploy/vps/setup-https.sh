#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/uniher"
DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Uso: bash deploy/vps/setup-https.sh <dominio> <email-certbot>"
  exit 1
fi

if [ ! -d "$APP_DIR" ]; then
  echo "Diretorio da aplicacao nao encontrado em $APP_DIR"
  exit 1
fi

echo "[1/7] Instalando Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

echo "[2/7] Criando Nginx temporario para validacao HTTP..."
cat >/etc/nginx/sites-available/uniher <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    client_max_body_size 10M;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/uniher /etc/nginx/sites-enabled/uniher
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "[3/7] Emitindo certificado..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect

echo "[4/7] Aplicando Nginx final do projeto..."
if [ -f "$APP_DIR/deploy/vps/nginx-uniher-https.conf" ]; then
  cp "$APP_DIR/deploy/vps/nginx-uniher-https.conf" /etc/nginx/sites-available/uniher
else
  echo "Arquivo nginx-uniher-https.conf nao encontrado"
  exit 1
fi

sed -i "s/__SERVER_NAME__/$DOMAIN/g" /etc/nginx/sites-available/uniher

echo "[5/7] Ajustando ambiente para HTTPS..."
if grep -q '^NEXT_PUBLIC_APP_URL=' "$APP_DIR/.env.production"; then
  sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|" "$APP_DIR/.env.production"
else
  echo "NEXT_PUBLIC_APP_URL=https://$DOMAIN" >>"$APP_DIR/.env.production"
fi

if grep -q '^ALLOW_INSECURE_HTTP_COOKIES=' "$APP_DIR/.env.production"; then
  sed -i 's|^ALLOW_INSECURE_HTTP_COOKIES=.*|ALLOW_INSECURE_HTTP_COOKIES=false|' "$APP_DIR/.env.production"
else
  echo 'ALLOW_INSECURE_HTTP_COOKIES=false' >>"$APP_DIR/.env.production"
fi

echo "[6/7] Validando e recarregando Nginx..."
nginx -t
systemctl reload nginx

echo "[7/7] Recarregando app com novo ambiente..."
cd "$APP_DIR"
pm2 restart uniher --update-env

echo "HTTPS configurado em https://$DOMAIN"
