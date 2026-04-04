# UniHER

Aplicação Next.js com autenticação por cookie httpOnly, SQLite local e deploy em VPS com Nginx + PM2.

## Desenvolvimento local

```bash
npm install
npm run dev
```

App local:

- `http://localhost:3000`

## Build

```bash
npm run build
```

## Seed base

```bash
npm run db:seed
```

Usuário master padrão:

- Email: `admin@uniher.com.br`
- Senha: `Admin@2026`

## Deploy na VPS

Diretório esperado na VPS:

- `/var/www/uniher`

Deploy padrão:

```bash
cd /var/www/uniher
bash deploy/vps/deploy.sh main
```

O script:

- atualiza código
- instala dependências
- faz build
- prepara standalone
- roda seed
- recarrega PM2
- espera a aplicação responder em `/api/health`

## HTTP temporário para testes

Enquanto estiver sem HTTPS, ajuste `.env.production`:

```env
NEXT_PUBLIC_APP_URL=http://srv1373909.hstgr.cloud
ALLOW_INSECURE_HTTP_COOKIES=true
```

Esse modo é só para teste.

## HTTPS com hostname da Hostinger

Para configurar HTTPS com `srv1373909.hstgr.cloud`:

```bash
cd /var/www/uniher
bash deploy/vps/setup-https.sh srv1373909.hstgr.cloud seu-email@dominio.com
```

O script:

- instala `certbot`
- emite certificado
- aplica Nginx com redirect para HTTPS
- troca `NEXT_PUBLIC_APP_URL` para `https://...`
- desativa `ALLOW_INSECURE_HTTP_COOKIES`
- reinicia a app com `pm2 restart uniher --update-env`

## Arquivos de deploy

- [deploy/vps/deploy.sh](C:/Users/User/projetoss/uniher/deploy/vps/deploy.sh)
- [deploy/vps/nginx-uniher.conf](C:/Users/User/projetoss/uniher/deploy/vps/nginx-uniher.conf)
- [deploy/vps/nginx-uniher-https.conf](C:/Users/User/projetoss/uniher/deploy/vps/nginx-uniher-https.conf)
- [deploy/vps/setup-https.sh](C:/Users/User/projetoss/uniher/deploy/vps/setup-https.sh)
- [docs/OPERACAO_VPS.md](C:/Users/User/projetoss/uniher/docs/OPERACAO_VPS.md)

## Documentação operacional

- [docs/OPERACAO_VPS.md](C:/Users/User/projetoss/uniher/docs/OPERACAO_VPS.md)
- [docs/PERFIS_E_PERMISSOES.md](C:/Users/User/projetoss/uniher/docs/PERFIS_E_PERMISSOES.md)
- [docs/MAPA_TELAS.md](C:/Users/User/projetoss/uniher/docs/MAPA_TELAS.md)
- [docs/APIS_CRITICAS.md](C:/Users/User/projetoss/uniher/docs/APIS_CRITICAS.md)
- [docs/CHECKLIST_PRODUCAO.md](C:/Users/User/projetoss/uniher/docs/CHECKLIST_PRODUCAO.md)

## Testes rápidos na VPS

```bash
curl -I http://127.0.0.1:3000/api/health
curl -I http://srv1373909.hstgr.cloud/
curl -I https://srv1373909.hstgr.cloud/
```
