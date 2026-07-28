# UniHER WWW Production Readiness Goal - 2026-07-28

## Decisao

Status: PASS para `www.uniher.com.br` live em modo controlado.

Motivo: o dominio publico responde com health OK, o commit candidato foi publicado, o deploy oficial na VPS Hostinger concluiu com release env PASS, PM2 online e smoke pos-deploy publico aprovado.

## Escopo

- Branch validado: `codex/uniher-wave3-collaborator-nr1`
- Worktree: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Sem merge ou rebase nesta rodada.
- Nao foram alteradas frentes de campanhas join, auth refresh, sidebar visual, NR-1/Yavix ou P8.

## Estado live observado

- `www.uniher.com.br` resolve como CNAME para `uniher.com.br`.
- `uniher.com.br` resolve para `187.77.42.199`.
- `curl -I -L https://www.uniher.com.br`: HTTP 200 via `nginx/1.24.0`.
- `curl https://www.uniher.com.br/api/health`: `status=healthy`, DB OK, `users=8`, `companies=1`, `writeQueue.pending=0`, `writeQueue.dlqSize=0`.
- `curl https://uniher.com.br/api/health`: `status=healthy` com o mesmo estado.
- VPS `srv1373909`: branch `codex/uniher-wave3-collaborator-nr1`, HEAD `5b8ea4c`, PM2 `uniher` online.

## Integracao P1 / tenant-api

- O commit local da frente P1 `644edae` possui patch equivalente ao commit ja integrado no branch base como `3239f84 fix: harden tenant scoped role APIs`.
- Nao houve cherry-pick novo para tenant/API nesta rodada.
- `src/app/api/rh/users/[id]/route.ts` ja contem `Departamento não encontrado` correto.

## Correcao aplicada

- `src/app/(platform)/agenda/page.tsx`
  - `Erro de conexão ao concluir evento`
  - `Erro de conexão ao cancelar evento`

## Deploy executado

- Push: `origin/codex/uniher-wave3-collaborator-nr1` atualizado para `5b8ea4c`.
- Backup DB antes do deploy: `/root/uniher-db-backups/uniher-20260728-100130-pre-5b8ea4c.db`.
- Comando VPS: `bash deploy/vps/deploy.sh codex/uniher-wave3-collaborator-nr1`.
- Deploy: PASS.
- Build na VPS: PASS, 148 rotas.
- Seed: PASS.
- `npm run check:release-env`: PASS 8, HOLD 0, FAIL 0.
- PM2: `uniher` online em `.next/standalone/server.js`.

## Gates executados

- Varredura de mojibake no arquivo alterado de Agenda: sem matches.
- Varredura focada de mojibake em `src`, `tests`, `package.json` e `scripts`: sem matches.
- `git diff --check`: PASS; aviso apenas de normalizacao LF -> CRLF em `src/app/(platform)/agenda/page.tsx`.
- `npx vitest run tests/unit/tenant-api-hardening.test.ts tests/unit/invite-leadership-capability.test.ts tests/unit/community-company-setting-audit.test.ts tests/unit/privacy/gamification-safe-projection.test.ts`: PASS, 4 arquivos, 29 testes.
- `npx tsc --noEmit --pretty false`: PASS.
- `NODE_ENV=production npm run build`: PASS, 148 rotas geradas.
- Smoke API autenticado:
  - admin login + `/api/auth/me` + `/admin`: PASS.
  - RH visual login + `/api/auth/me`: PASS.
  - `/api/rh/agenda`: 410 esperado por `privacy_review`.
  - colaboradora NR-1 login + `/api/auth/me` + `/agenda` + `/api/collaborator/agenda`: PASS.
- Smoke visual publico minimo: PASS 4/4.
- Evidencia visual: `docs/superpowers/evidence/www-production-smoke-2026-07-28/`.

## Proxima acao

1. Manter monitoramento de health/PM2 nas proximas horas.
2. Fazer revisao humana visual/produto antes de prometer aprovacao final para cliente.
3. Triar as 26 vulnerabilidades reportadas por `npm ci` em frente separada.

## Riscos / limites

- PASS live e restrito a disponibilidade tecnica e demo controlada.
- Nao converter este resultado em promessa de NR-1/Yavix real, COPSOQ completo, scoring clinico, SIPAT, Concierge, denuncias, DH ou ranking sem os gates especificos dessas frentes.
- A home raiz ainda e servida por camada estatica/Nginx com `Last-Modified: Tue, 21 Jul 2026`; as rotas da aplicacao e APIs foram validadas via proxy Next/PM2.
