# Deploy na VPS Hostinger (Ubuntu 24.04)

Este projeto roda melhor nessa VPS com:

- `Node.js 22 LTS`
- `npm ci --include=dev`
- `Next.js` em modo produção
- `PM2` para manter o processo vivo
- `Nginx` como proxy reverso
- banco local `SQLite` em `data/uniher.db`

## 1. Premissas

- VPS Ubuntu 24.04
- acesso root
- IP atual: `187.77.42.199`
- repositório: `https://github.com/pretinhuu1-boop/uniher`

Importante:

- este projeto usa `better-sqlite3`
- existe job interno de lembretes e backup em `src/instrumentation.ts`
- por isso a aplicação deve rodar com **1 instância apenas**
- não usar cluster do PM2

## 2. Instalação inicial na VPS

```bash
apt update && apt upgrade -y
apt install -y nginx git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
npm install -g pm2
```

Validar:

```bash
node -v
npm -v
pm2 -v
```

## 3. Baixar o projeto

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/pretinhuu1-boop/uniher.git
cd /var/www/uniher
mkdir -p data backups
```

## 4. Configurar variáveis de ambiente

Criar o arquivo:

```bash
cp .env.example .env.production
nano .env.production
```

Sugestão mínima:

```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://SEU-DOMINIO
DATABASE_PATH=/var/www/uniher/data/uniher.db
ALLOW_INSECURE_HTTP_COOKIES=false

JWT_SECRET=GERAR_UM_SEGREDO_FORTE_COM_32+_CARACTERES
JWT_REFRESH_SECRET=GERAR_OUTRO_SEGREDO_FORTE_COM_32+_CARACTERES

RESEND_API_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
```

Notas:

- `JWT_SECRET` e `JWT_REFRESH_SECRET` são obrigatórios
- `RESEND_API_KEY` só é necessário se quiser email real
- push só funciona se preencher `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`
- o nome correto da chave pública VAPID neste projeto é `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

Observação de cookies:

- em homologação HTTP provisória, use `NEXT_PUBLIC_APP_URL=http://...` e `ALLOW_INSECURE_HTTP_COOKIES=true`
- em produção correta com domínio + HTTPS, mantenha `NEXT_PUBLIC_APP_URL=https://...` e `ALLOW_INSECURE_HTTP_COOKIES=false`

Gerar secrets:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 5. Instalar dependências e build

```bash
cd /var/www/uniher
npm ci --include=dev
set -a
source .env.production
set +a
npm run build
```

## 6. Inicializar banco

O banco SQLite é criado automaticamente quando a aplicação sobe. Para popular a base padrão:

```bash
cd /var/www/uniher
set -a
source .env.production
set +a
npm run db:seed
```

Usuários padrão do seed:

- Admin: `admin@uniher.com.br / Admin@2026`
- RH demo: `contabilidade@eduardaeyurimarketingltda.com.br / Admin@2026`

Troque essas senhas depois do primeiro acesso.

## 7. Preparar standalone

Depois do build, copie os assets públicos para o diretório standalone:

```bash
cd /var/www/uniher
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
rm -rf .next/standalone/public
cp -R public .next/standalone/public
```

## 8. Subir com PM2

```bash
cd /var/www/uniher
set -a
source .env.production
set +a
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Verificar:

```bash
pm2 status
pm2 logs uniher
curl http://127.0.0.1:3000
```

## 9. Configurar Nginx

Copiar a configuração pronta:

```bash
cp /var/www/uniher/deploy/vps/nginx-uniher.conf /etc/nginx/sites-available/uniher
ln -s /etc/nginx/sites-available/uniher /etc/nginx/sites-enabled/uniher
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

Se já tiver domínio, troque `server_name _;` pelo domínio real.

## 10. HTTPS com Certbot

Se o domínio já apontar para a VPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d SEU-DOMINIO -d www.SEU-DOMINIO
```

## 11. Atualizações futuras

Há um script pronto no projeto:

```bash
cd /var/www/uniher
bash deploy/vps/deploy.sh main
```

Esse script:

- faz `git pull`
- roda `npm ci --include=dev`
- garante `data/` e `backups/`
- roda `build`
- roda `db:seed`
- reinicia no PM2

## 12. O que revisar depois do deploy

- login do admin
- criação de evento na agenda
- notificações
- service worker em `public/sw.js`
- lembretes popup
- permissões por perfil

## 13. Observações importantes

- Como usa SQLite, mantenha o app em uma instância
- Faça backup periódico de `/var/www/uniher/data/uniher.db`
- Se quiser maior robustez futura, o próximo passo natural é migrar de SQLite para Postgres
