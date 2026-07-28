# UniHER leadership visual scorecard

Date: 2026-07-28
Wave: 07 - `finish-visual-leadership-demo`
Branch: `codex/uniher-finish-visual-leadership-demo`

## Decision

**PASS COM RESSALVAS para a wave.**

A matriz visual agora cobre o papel `lideranca` em fixture propria, com as duas superficies ja existentes no contrato atual: `/dashboard` e `/campanhas`. A geometria do sidebar tambem passou a cobrir mobile, tablet, desktop e desktop-wide para todos os papeis.

Este PASS nao e aprovacao visual humana da Dra. Paola e nao transforma lideranca em produto novo. O que pode ser demonstrado e: lideranca abre dashboard de equipe protegido por departamento persistido e campanhas dentro do shell autenticado. Nao prometer funcionalidades clinicas, ranking, laudo, NR-1/Yavix operacional, SIPAT operacional, Concierge, Canal de Denuncias ou Desenvolvimento Humano a partir desta wave.

## Scope

- Added controlled Playwright fixture for `lideranca.visual@eduardaeyurimarketingltda.com.br`.
- Added `lideranca` to the visual route matrix.
- Added leadership routes:
  - `/dashboard`
  - `/campanhas`
- Expanded sidebar geometry guard from mobile/tablet only to all four visual smoke viewports.
- Fixed footer user-name wrapping in the sidebar after the expanded desktop guard found clipping.
- Added static contract test for the leadership visual smoke setup.
- Forced leadership dashboard scope to the persisted leadership department; querystring `departmentId` is ignored for `lideranca`.
- Added 403 guard when a leadership user has no persisted department.
- Added Zod validation and audit logging for leadership approval in `/api/leader/team`.

## Evidence

| Gate | Result |
| --- | --- |
| RED static contract before implementation | FAIL expected: `VisualSmokeRole` did not include `lideranca`. |
| RED expanded desktop sidebar geometry | FAIL expected after guard expansion: desktop 1366 clipped footer names for RH/colaboradora. |
| RED leadership dashboard scope | FAIL expected before route change: leader could pass query `departmentId` instead of persisted department. |
| RED leadership no-department guard | FAIL expected before route change: leader without department returned dashboard instead of 403. |
| `node --test tests\visual-ux-smoke-leadership-contract.test.cjs` | PASS, 1/1. |
| `npm run test:unit -- tests\unit\dashboard-leadership-scope.test.ts tests\unit\tenant-api-hardening.test.ts tests\unit\platform\navigation.test.ts` | PASS, 3 files / 40 tests. |
| `npx tsc --noEmit --pretty false` | PASS. |
| `git diff --check` | PASS; LF/CRLF warnings only. |
| `npm run test:visual-ux-smoke` | PASS, 2/2 Playwright tests, 6.2m. |
| Claude Opus review, first pass | PASS COM RESSALVAS; found P1-A/P1-B/P1-C listed below. |
| Claude Opus re-review after P1 fixes | PASS COM RESSALVAS; no remaining P0/P1. P2/P3 are preexisting debt, not introduced by this wave. |

## Visual Evidence

- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md`
- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.json`
- `docs/superpowers/evidence/visual-ux-smoke-latest/sidebar-geometry-report.json`
- Screen smoke generated at `2026-07-28T02:20:27.262Z`.
- Sidebar geometry generated at `2026-07-28T02:21:27.938Z`.
- Matrix result: **192/192 PASS**, 48 route/view combinations, 4 viewports.
- Sidebar geometry result: `issues: []` across mobile-375, tablet-768, desktop-1366 and desktop-wide-1920.
- Leadership route screenshots:
  - `mobile-375-lideranca-lideranca-dashboard.png`
  - `mobile-375-lideranca-lideranca-campanhas.png`
  - `tablet-768-lideranca-lideranca-dashboard.png`
  - `tablet-768-lideranca-lideranca-campanhas.png`
  - `desktop-1366-lideranca-lideranca-dashboard.png`
  - `desktop-1366-lideranca-lideranca-campanhas.png`
  - `desktop-wide-1920-lideranca-lideranca-dashboard.png`
  - `desktop-wide-1920-lideranca-lideranca-campanhas.png`
- Leadership sidebar screenshots:
  - `mobile-375-lideranca-sidebar-top.png`
  - `mobile-375-lideranca-sidebar-bottom.png`
  - `tablet-768-lideranca-sidebar-top.png`
  - `tablet-768-lideranca-sidebar-bottom.png`
  - `desktop-1366-lideranca-sidebar-top.png`
  - `desktop-1366-lideranca-sidebar-bottom.png`
  - `desktop-wide-1920-lideranca-sidebar-top.png`
  - `desktop-wide-1920-lideranca-sidebar-bottom.png`

## Findings

- P0: none found.
- P1 fixed: Claude P1-A found missing Zod body validation in `/api/leader/team`; fixed with strict `LeaderTeamActionSchema` and 422 test.
- P1 fixed: Claude P1-B found missing audit trail for leadership approvals; fixed with `logAudit` and unit assertion.
- P1 fixed: Claude P1-C found dashboard/label scope mismatch for `lideranca`; fixed by forcing persisted department scope and blocking leaders without department.
- P2 fixed: expanded desktop sidebar guard exposed clipped footer user names at desktop 1366 for RH/colaboradora; fixed by allowing controlled wrapping for `.userName`.
- P2 residual preexisting: audit API commonly receives `actorEmail: userId` because auth context does not expose actor email; Claude confirmed this is a cross-codebase pattern outside this wave.
- P3 residual: visual smoke remains a technical/geometry gate. Final visual/product approval remains external.
- P3 residual: Claude first pass also noted pre-existing debt outside this wave: hardcoded demo seed password, health endpoint count detail, admin sidebar badges and one remaining `context as any` pattern in surrounding tests.

## Recommendation

Integrate this wave into the coordinator if the coordinator cherry-pick and ledger update stay clean. This is a technical PASS with external visual/product approval still required before presenting it as final product approval.
