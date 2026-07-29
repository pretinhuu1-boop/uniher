# UniHER smoke/deploy evidence package

Data: 2026-07-27
Worktree: `C:\Users\user\Documents\uniher-app-audit\.worktrees\kill-smoke-deploy-package`
Branch: `codex/uniher-kill-smoke-deploy-package`

## Source of truth

- Checklist/scorecard: `docs/superpowers/audits/2026-07-27-uniher-release-smoke-deploy-checklist.md`
- Matriz de conclusao 9 frentes: `docs/superpowers/audits/2026-07-27-uniher-nine-fronts-completion-matrix.md`
- Auditoria executiva: `docs/superpowers/audits/2026-07-27-uniher-three-week-client-readiness-audit.md`
- Mapa menu/rotas: `docs/superpowers/audits/2026-07-27-uniher-sidebar-route-map.md`

## Existing evidence index

- `docs/superpowers/evidence/screen-smoke-2026-07-27-final/screen-smoke-report.md`: 60/60 telas autenticadas PASS no registro anterior.
- `docs/superpowers/evidence/screen-smoke-2026-07-27-final/final-visual-review.md`: revisao tecnica do smoke corrigido.
- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md`: matriz visual ampla, atualizada pelo comando `npm run test:visual-ux-smoke`.
- `docs/superpowers/evidence/visual-ux-smoke-latest/sidebar-geometry-report.json`: guarda de geometria sidebar/top-bottom.

## Fresh command receipt

| Comando | Resultado | Observacao |
| --- | --- | --- |
| `git status --short --branch` | PASS | Worktree criada limpa na base `2e348d4`; docs/scripts desta frente ainda nao commitados no inicio. |
| `npm ci` | PASS apos ajuste | Primeira tentativa falhou porque `package.json` pedia `@types/bcryptjs@^3.0.3`, versao inexistente; corrigido para `^2.4.6` como no lockfile. Instalou 576 pacotes; `npm audit` reportou 26 vulnerabilidades: 2 low, 16 moderate, 8 high. |
| `npm run check:release-env` sem env final | FAIL esperado | Sem arquivos/env carregados: faltam `JWT_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH`. |
| `npm run check:release-env` com env local Playwright | HOLD | PASS 4, HOLD 3, FAIL 0; HTTP/insecure cookies permitidos so para local/homologacao; `nr1.visual@eduardaeyurimarketingltda.com.br` ausente antes do fixture do smoke. |
| `npx tsc --noEmit` | PASS | Primeira tentativa antes de `npm ci` caiu no pacote errado do `npx`; repetido apos dependencias instaladas sem erros. |
| `npm run build` | PASS | Next 16.2.1; compilou em 50s, TypeScript em 74s, 148 paginas/rotas estaticas geradas. |
| `npm run test:next-config` | PASS | 1/1 PASS. |
| `node --test tests/prepare-playwright-static.test.cjs` | PASS | 2/2 PASS; cobre copia de `public/` para arvore standalone. |
| `npm run test:unit` | HOLD | 63 arquivos PASS, 2 arquivos FAIL; 576/581 testes PASS. Falhas: `tests/unit/platform/sidebar-capability.test.tsx` (4) e `tests/unit/platform/dashboard-css.test.ts` (1). |
| `npm run test:visual-ux-smoke` | HOLD | WebServer do Playwright excedeu 180000ms; Next build worker saiu com code 1. |
| `npm run test:visual-ux-smoke:local` | HOLD | Runner diagnostico seedou DB e subiu tentativa local, mas `.next/standalone/server.js` nao existe e `next start` reportou ausencia de build de producao/`BUILD_ID`. |
| `git diff --check` | PASS | Sem erros; apenas aviso LF/CRLF em `package.json`. |
| Varredura de segredos/tamanho | PASS | Arquivos novos pequenos: 3.6KB a 6.1KB; varredura nao encontrou chaves/tokens. Unico hit foi campo de schema `must_change_password`. |

## Release position

- Envio/merge tecnico: `HOLD` ate unit/smoke/env serem resolvidos ou explicitamente aceitos como risco.
- Aprovacao visual humana: `HOLD`.
- Deploy/prod: `HOLD`.

## Unit failures snapshot

- `tests/unit/platform/dashboard-css.test.ts`: contrato de ritmo 8px encontrou `gap: 6px`, `gap: 10px`, `gap: 6px`.
- `tests/unit/platform/sidebar-capability.test.tsx`: links esperados de Comunidade/Educacao/Viva SIPAT/module-aware navigation nao aparecem nas expectativas atuais.

## Smoke visual note

A evidencia versionada anterior em `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md` permanece como registro historico de 184/184 PASS gerado em 2026-07-27T19:29:04.074Z. Esta frente nao conseguiu recaptura fresca por bloqueio de runner/start local; portanto nao usar a evidencia anterior como substituta automatica de gate fresco.
