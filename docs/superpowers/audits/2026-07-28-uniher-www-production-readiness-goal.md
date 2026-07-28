# UniHER WWW Production Readiness Goal - 2026-07-28

## Decisao

Status: HOLD para nova promocao de producao; PASS para manter `www.uniher.com.br` live em modo controlado.

Motivo: o dominio publico esta respondendo com health OK, mas a rodada encontrou e corrigiu um mojibake production-facing em Agenda no branch candidato. Como o commit e local e nao foi enviado/deployado nesta rodada, a promocao do novo candidato deve aguardar push/deploy explicito e smoke pos-deploy.

## Escopo

- Branch validado: `codex/uniher-wave3-collaborator-nr1`
- Worktree: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Sem push, merge, rebase ou deploy nesta rodada.
- Nao foram alteradas frentes de campanhas join, auth refresh, sidebar visual, NR-1/Yavix ou P8.

## Estado live observado

- `www.uniher.com.br` resolve como CNAME para `uniher.com.br`.
- `uniher.com.br` resolve para `187.77.42.199`.
- `curl -I -L https://www.uniher.com.br`: HTTP 200 via `nginx/1.24.0`.
- `curl https://www.uniher.com.br/api/health`: `status=healthy`, DB OK, `users=8`, `companies=1`, `writeQueue.pending=0`, `writeQueue.dlqSize=0`.
- `curl https://uniher.com.br/api/health`: `status=healthy` com o mesmo estado.

## Integracao P1 / tenant-api

- O commit local da frente P1 `644edae` possui patch equivalente ao commit ja integrado no branch base como `3239f84 fix: harden tenant scoped role APIs`.
- Nao houve cherry-pick novo para tenant/API nesta rodada.
- `src/app/api/rh/users/[id]/route.ts` ja contem `Departamento não encontrado` correto.

## Correcao aplicada

- `src/app/(platform)/agenda/page.tsx`
  - `Erro de conexão ao concluir evento`
  - `Erro de conexão ao cancelar evento`

## Gates executados

- Varredura de mojibake no arquivo alterado de Agenda: sem matches.
- Varredura focada de mojibake em `src`, `tests`, `package.json` e `scripts`: sem matches.
- `git diff --check`: PASS; aviso apenas de normalizacao LF -> CRLF em `src/app/(platform)/agenda/page.tsx`.
- `npx vitest run tests/unit/tenant-api-hardening.test.ts tests/unit/invite-leadership-capability.test.ts tests/unit/community-company-setting-audit.test.ts tests/unit/privacy/gamification-safe-projection.test.ts`: PASS, 4 arquivos, 29 testes.
- `npx tsc --noEmit --pretty false`: PASS.
- `NODE_ENV=production npm run build`: PASS, 148 rotas geradas.

## Proxima acao para deixar novo candidato live

1. Enviar o commit local desta rodada para o remoto autorizado.
2. Fazer deploy Hostinger/VPS a partir do commit exato aprovado.
3. Rodar smoke pos-deploy em `https://www.uniher.com.br`, incluindo `/api/health`, login demo e Agenda.
4. Registrar hash implantado e evidencias.

## Riscos / limites

- A rodada nao fez deploy; portanto a correcao de Agenda nao esta garantida no live atual.
- PASS live e restrito a disponibilidade tecnica e demo controlada.
- Nao converter este resultado em promessa de NR-1/Yavix real, COPSOQ completo, scoring clinico, SIPAT, Concierge, denuncias, DH ou ranking sem os gates especificos dessas frentes.
