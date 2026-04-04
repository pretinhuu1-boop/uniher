# Checklist de Produção

Checklist público e seguro para preparação de deploy e validação pós-deploy.

## Antes do deploy

- `git status` limpo ou controlado
- build local passando
- documentação crítica atualizada
- `.env.production` revisado na VPS
- host e Nginx definidos

## Segurança

- `NEXT_PUBLIC_APP_URL` correto
- `ALLOW_INSECURE_HTTP_COOKIES=false` quando estiver em HTTPS
- rotas master protegidas
- links administrativos ocultos para perfis indevidos
- secrets fora do Git

## Deploy

```bash
cd /var/www/uniher
git fetch origin
git reset --hard origin/main
bash deploy/vps/deploy.sh main
```

## Pós-deploy

- `pm2 status`
- `pm2 logs uniher --lines 100`
- `curl -I http://127.0.0.1:3000/api/health`
- teste externo do host
- teste de login
- teste de painel admin master
- teste de RH/admin empresa
- teste de colaboradora

## Navegador

- limpar cache se houve mudança em auth, chunks ou service worker
- se necessário: `Application -> Service Workers -> Unregister`
- hard refresh após atualização sensível

## Fluxos mínimos para aceitar produção

- login
- logout
- sessão persistente
- troca obrigatória de senha
- painel admin master
- gestão da empresa pelo RH/admin empresa
- jornada da colaboradora
- notificações
- leitura de itens persistindo
- health check respondendo
