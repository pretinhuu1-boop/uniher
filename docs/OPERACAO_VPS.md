# Operação da VPS

Documento público e seguro para manter contexto operacional do projeto no repositório.

Este arquivo pode ser versionado.

Não inclui:

- senhas
- tokens
- segredos
- credenciais de banco
- conteúdo privado de `.env.production`

## Visão geral

- Projeto: `UniHER`
- Stack: `Next.js`, `TypeScript`, `SQLite`, `PM2`, `Nginx`
- Repositório: `pretinhuu1-boop/uniher`
- Diretório esperado na VPS: `/var/www/uniher`
- Processo PM2: `uniher`
- Porta interna da app: `127.0.0.1:3000`

## Estrutura de deploy

Arquivos principais:

- [deploy/vps/deploy.sh](C:/Users/User/projetoss/uniher/deploy/vps/deploy.sh)
- [deploy/vps/nginx-uniher.conf](C:/Users/User/projetoss/uniher/deploy/vps/nginx-uniher.conf)
- [deploy/vps/nginx-uniher-https.conf](C:/Users/User/projetoss/uniher/deploy/vps/nginx-uniher-https.conf)
- [deploy/vps/setup-https.sh](C:/Users/User/projetoss/uniher/deploy/vps/setup-https.sh)
- [ecosystem.config.cjs](C:/Users/User/projetoss/uniher/ecosystem.config.cjs)

## Deploy padrão

Atualizar o servidor com o estado atual do `main`:

```bash
cd /var/www/uniher
git fetch origin
git reset --hard origin/main
bash deploy/vps/deploy.sh main
```

O script de deploy faz:

1. atualizar o código
2. instalar dependências
3. carregar `.env.production`
4. garantir `data/` e `backups/`
5. rodar build
6. preparar `.next/standalone`
7. executar seed base
8. recarregar PM2
9. esperar `/api/health` responder

## Ambiente

O arquivo `.env.production` deve existir na VPS.

Itens operacionais importantes:

- `NODE_ENV=production`
- `PORT=3000`
- `NEXT_PUBLIC_APP_URL`
- `DATABASE_PATH`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

Observação:

- nunca commitar `.env.production`
- nunca registrar secrets neste documento

## HTTP temporário para teste

Enquanto o ambiente estiver sem HTTPS, o comportamento de cookies precisa ser compatível com HTTP.

Nesse cenário, o `.env.production` deve usar:

```env
NEXT_PUBLIC_APP_URL=http://SEU_HOST
ALLOW_INSECURE_HTTP_COOKIES=true
```

Uso recomendado:

- apenas para teste
- nunca como configuração final de produção

## HTTPS correto

Quando houver host válido apontando para a VPS, aplicar:

```bash
cd /var/www/uniher
bash deploy/vps/setup-https.sh SEU_HOST SEU_EMAIL
```

O script de HTTPS:

1. instala `certbot`
2. emite certificado
3. configura redirect `http -> https`
4. ajusta `.env.production`
5. troca `NEXT_PUBLIC_APP_URL` para `https://...`
6. força `ALLOW_INSECURE_HTTP_COOKIES=false`
7. recarrega `nginx`
8. reinicia `pm2` com variáveis atualizadas

## Nginx

Função atual do Nginx:

- proxy reverso para a aplicação Next
- compressão gzip
- servir `/_next/static` diretamente
- servir `sw.js`, `manifest.json` e logos com cache-control adequado
- timeout de proxy configurado

## PM2

Comandos úteis:

```bash
pm2 status
pm2 logs uniher --lines 100
pm2 restart uniher --update-env
pm2 save
```

## Testes rápidos de saúde

Comandos de verificação:

```bash
curl -I http://127.0.0.1:3000/api/health
curl -I http://SEU_HOST/
curl -I https://SEU_HOST/
```

## Banco de dados

Banco atual:

- SQLite local

Comportamento esperado:

- WAL ativo
- `busy_timeout`
- fila de escrita
- migrations automáticas na inicialização do banco

## Permissões

O projeto possui distinção entre:

- `Admin Master`
- `Admin Empresa / RH`
- `Colaboradora`

Arquivos centrais dessa camada:

- [src/lib/auth/jwt.ts](C:/Users/User/projetoss/uniher/src/lib/auth/jwt.ts)
- [src/lib/auth/middleware.ts](C:/Users/User/projetoss/uniher/src/lib/auth/middleware.ts)
- [src/services/auth.service.ts](C:/Users/User/projetoss/uniher/src/services/auth.service.ts)
- [src/app/api/auth/me/route.ts](C:/Users/User/projetoss/uniher/src/app/api/auth/me/route.ts)
- [src/app/api/admin/alerts/send/route.ts](C:/Users/User/projetoss/uniher/src/app/api/admin/alerts/send/route.ts)

## Migrations relevantes

- [045_admin_alert_audience.sql](C:/Users/User/projetoss/uniher/src/lib/db/migrations/045_admin_alert_audience.sql)
- [046_add_is_master_admin_to_users.sql](C:/Users/User/projetoss/uniher/src/lib/db/migrations/046_add_is_master_admin_to_users.sql)

## Service Worker e cache

Arquivo central:

- [ServiceWorkerRegistration.tsx](C:/Users/User/projetoss/uniher/src/components/ServiceWorkerRegistration.tsx)

Comportamento atual:

- desativa service worker em origem não confiável
- limpa caches antigos `uniher-*`
- reduz risco de chunks antigos e telas desatualizadas

Se o navegador continuar com versão antiga:

1. abrir DevTools
2. `Application`
3. `Service Workers` -> `Unregister`
4. `Clear storage`
5. hard refresh

## Problemas já observados

- sessão falhando em HTTP quando `ALLOW_INSECURE_HTTP_COOKIES` não está correto
- cache antigo de PWA mantendo frontend desatualizado
- textos com codificação quebrada em algumas telas legadas
- necessidade de limpar cache do navegador depois de mudanças sensíveis no frontend

## Checklist operacional

Antes de dizer que a VPS está correta:

- `git fetch origin` concluído
- `git reset --hard origin/main` concluído
- `bash deploy/vps/deploy.sh main` concluído
- `pm2 status` com `uniher` online
- `curl -I http://127.0.0.1:3000/api/health` respondendo
- host externo respondendo
- navegador sem service worker antigo preso

## Regra de segurança

Nunca registrar neste documento:

- senha de usuário
- email/senha administrativa
- conteúdo completo de `.env.production`
- JWTs
- chaves VAPID
- tokens de serviços externos
