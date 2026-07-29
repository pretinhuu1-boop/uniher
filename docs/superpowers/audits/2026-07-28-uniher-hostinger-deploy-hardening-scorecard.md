# UniHER Hostinger deploy hardening scorecard

Data: 2026-07-28
Ambiente: VPS Hostinger `srv1373909`
URL publica: `https://uniher.com.br`
Branch em producao: `codex/uniher-wave3-collaborator-nr1`
HEAD em producao: `c862cda fix: report configured database size in health`
Decisao: **PASS operacional para envio controlado a doutora**

## Sumario executivo

A UniHER esta online na VPS Hostinger, com deploy final aplicado em
`c862cda`. O pacote atual passou por build de producao, migrations, seed,
preflight de ambiente, PM2 standalone, health local/publico e smoke visual
autenticado minimo.

O que esta pronto para apresentar: plataforma autenticada, estrutura por
papeis, dashboard RH agregado/protegido, login demo, seed visual, health de
producao, deploy reproduzivel e modulos sensiveis em estado bloqueado/gated.

O que nao deve ser prometido: NR-1/Yavix real, questionario COPSOQ ativo,
score/laudo clinico, SIPAT com conteudo pronto, Concierge, Canal de Denuncias,
Desenvolvimento Humano, ranking/liga competitiva ou qualquer funcionalidade
clinica/contratual alem dos shells bloqueados e da base tecnica existente.

## Commits desta rodada

| Commit | Conteudo |
| --- | --- |
| `77de019` | Blacklist persistente de access token via SQLite, migration 062, seed `nr1.visual`, gate release-env para backend sqlite, correcao `datetime('now')`, testes. |
| `a3ff3bb` | Deploy script recria o processo PM2 `uniher` para garantir runtime standalone. |
| `c862cda` | `/api/health` passa a medir o DB configurado em `DATABASE_PATH`, corrigindo evidencia `sizeBytes`. |

## Evidencia local

| Gate | Resultado |
| --- | --- |
| `npm run test:unit -- tests/unit/auth-token-blacklist.test.ts tests/unit/auth-refresh-token-repository.test.ts tests/unit/auth-session-revocation.test.ts tests/unit/auth-proxy-secret.test.ts` | PASS, 4 arquivos / 11 testes |
| `node --test tests/health-db-size-config.test.cjs tests/check-release-env-security.test.cjs` | PASS, 3/3 |
| `npm run db:seed` + `npm run check:release-env` em DB temporario com `ACCESS_TOKEN_BLACKLIST_BACKEND=sqlite` | PASS 8, HOLD 0, FAIL 0 |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run build` | PASS, 148 rotas geradas, sem warning final de tracing |
| `git diff --check` | PASS |
| Claude Opus review | PASS; P1 iniciais foram corrigidos antes do commit final |

## Evidencia Hostinger

| Gate | Resultado |
| --- | --- |
| Backup DB antes do deploy final | `/root/uniher-db-backups/uniher-20260728-081757-pre-c862cda.db` |
| Git remoto | HEAD `c862cda`, branch `codex/uniher-wave3-collaborator-nr1`, worktree limpa |
| `npm run check:release-env` na VPS | PASS 8, HOLD 0, FAIL 0 |
| PM2 | `uniher` online, script `/var/www/uniher/.next/standalone/server.js`, restarts 0 no processo novo |
| Health local | `healthy`, DB `ok`, `sizeBytes=2146304`, `users=8`, `companies=1`, queue sem pendencias |
| Health publico | `healthy`, DB `ok`, `sizeMB=2.05`, `users=8`, `companies=1` |
| Logs PM2 novos | `uniher-error-9.log` com 0 bytes; `uniher-out-9.log` apenas Next ready |

## Evidencia visual de producao

Diretorio: `docs/superpowers/evidence/hostinger-deploy-2026-07-28-final/`

| Print | Resultado |
| --- | --- |
| `auth-public-desktop.png` | `/auth` publico carregou sem console errors ou respostas HTTP >= 400 |
| `rh-dashboard-desktop.png` | Login RH demo carregou `/dashboard` com indicadores agregados/protegidos |
| `rh-dashboard-mobile.png` | Mesmo fluxo RH em viewport mobile |
| `nr1-blocked-desktop.png` | Colaboradora demo acessou `/avaliacao-nr1` e foi redirecionada para `/nr1` bloqueado |
| `nr1-blocked-mobile.png` | Mesmo fluxo NR-1 bloqueado em mobile |
| `visual-production-smoke.json` | Registro Playwright: 5/5 capturas, console errors 0, failed responses 0 |

## Findings e riscos

| Sev. | Finding | Status |
| --- | --- | --- |
| P0 | Nenhum P0 remanescente encontrado nesta rodada. | Fechado |
| P1 | Blacklist de access token in-memory em producao. | Fechado com backend SQLite + gate release-env PASS |
| P1 | PM2 rodando `npm run start` apesar de standalone. | Fechado; PM2 agora aponta para `.next/standalone/server.js` |
| P1 | `datetime("now")` quebrava refresh token no SQLite. | Fechado com regressao de teste |
| P2 | `npm ci` reporta 26 vulnerabilidades auditaveis: 2 low, 16 moderate, 8 high. | Pendente de triagem separada; nao bloqueou deploy atual |
| P2 | Producao esta apontando para branch de trabalho, nao `main`. | Aceito para esta entrega; alinhar merge/promocao final depois |
| P2 | Smoke visual tecnico nao equivale a aprovacao visual final da cliente. | Registrar como evidencia tecnica, nao aprovacao de design |
| P3 | `pm2 delete/start` causa pequena janela de restart durante deploy. | Aceito para garantir standalone |

## Recomendacao de envio

**PASS para enviar uma mensagem comercial honesta para a doutora**, desde que o
texto use estes limites:

- Pode dizer que a plataforma UniHER esta online em producao, com area
  autenticada, perfis/papeis, RH dashboard agregado, shells de modulos e
  evidencias tecnicas recentes.
- Pode dizer que NR-1/Yavix e SIPAT estao visiveis como areas reservadas ou
  bloqueadas por contrato, sem execucao clinica.
- Nao dizer que ha diagnostico NR-1, laudo, COPSOQ real, score clinico,
  integracao Yavix ativa, conteudo SIPAT pronto, Concierge operacional,
  Canal de Denuncias operacional, ranking ou funcionalidades sensiveis
  habilitadas para colaboradoras.

Proxima etapa recomendada: preparar o texto de envio com a narrativa das tres
semanas de trabalho e anexar as evidencias visuais principais como apoio, sem
chamar smoke tecnico de aprovacao final.
