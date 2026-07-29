# UniHER Frente 05 - Sidebar, Menu e Evidencia Visual

Gerado em: 2026-07-27
Worktree: `C:\Users\user\Documents\uniher-app-audit\.worktrees\kill-sidebar-menu`
Branch: `codex/uniher-kill-sidebar-menu`
Base: `2e348d4908d581723f619259de9b71c8339a8c53`

## Decisao

P1 fechado para a frente sidebar/menu.

## Mudancas de produto

- Sidebar sem suporte de numeracao visual: `sequenceNumber`, `showSequence`, `navSequence` e `navItemSequenced` foram removidos dos componentes/CSS da plataforma.
- Colaboradora passa a enxergar `Objetivos` e `Desafios` como rotas self-only existentes, antes de `Conquistas`.
- Admin/RH passam a ver `Objetivos e Desafios` apontando para a superficie de governanca/revisao existente, sem prometer liga ou ranking ativo.
- Copy de RH Educacao e Admin Produtos/Modulos foi reduzida para evitar promessa de videoaulas/trilhas/ativacao automatica.
- Runner visual Playwright agora seta `NODE_ENV=production` antes do build para gerar `.next/standalone/server.js`.
- Fixture visual de RH ficou idempotente: nao repete PATCH de tour quando o login ja informa `firstAccessTourCompleted=true`.

## Evidencia de ausencia de numeros

- `rg -n "sequenceNumber|navSequence|navItemSequenced|showSequence" src\components\platform -S` retornou `NO_SEQUENCE_RENDER_SUPPORT_IN_PLATFORM_COMPONENTS`.
- `node --test tests/platform-sidebar-contract.test.cjs` passou e valida que a chamada de producao nao reintroduz sequencia.
- `npx vitest run tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx` passou com 38 testes, incluindo render de chevrons sem `<span>1</span>`/`<span>2</span>`.

## Gates executados

- PASS: `node --test tests/platform-sidebar-contract.test.cjs` - 2/2.
- PASS: `npx vitest run tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx` - 38/38.
- PASS: `npx tsc --noEmit`.
- PASS: `node --test tests/next-config.test.cjs` - 1/1.
- PASS: `node --test tests/prepare-playwright-static.test.cjs` - 2/2.
- PASS: `npm run build`.
- PASS: `npm run test:visual-ux-smoke` - 2/2.

## Evidencia visual

Pacote recapturado: `docs/superpowers/evidence/visual-ux-smoke-latest/`

- `screen-smoke-report.md`: 184 rotas/viewports PASS, 0 FAIL.
- `screen-smoke-report.json`: total 184, PASS 184.
- `sidebar-geometry-report.json`: `issues: []`.
- Screenshots: 196 PNGs.
- Cobertura visual local: Admin, RH, Colaboradora em `mobile-375`, `tablet-768`, `desktop-1366`, `desktop-wide-1920`.
- Lideranca: coberta por contrato de navegacao/render unitario; a matriz visual local existente nao possui fixture/credencial de lideranca.

## Fora de escopo preservado

- Nao houve alteracao em auth runtime, campanhas join, agenda ou P8 real.
- Liga continua em superficie de revisao/contencao; nao foi promovida para ranking ou competicao.

## Riscos residuais

- A suite visual ainda inclui rotas legadas de revisao (`/desafios/gerenciar`, `/liga/gerenciar`) para RH como telas bloqueadas, nao como destinos de sidebar.
- Visual approval humano continua separado: os screenshots passaram geometria/smoke, mas nao substituem revisao visual independente.
