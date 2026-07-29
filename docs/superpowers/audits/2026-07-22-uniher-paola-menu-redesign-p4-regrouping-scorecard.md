# UniHER Paola menu redesign P4 regrouping scorecard

**Date:** 2026-07-22
**Lane:** `P4 Existing surface regrouping`
**Status:** PASS after finding corrections and auth redirect validation
**Coordinator:** current session

## Objective

Regroup the existing Dashboard, Educacao, Agenda and Conquistas surfaces in the authenticated navigation without creating duplicate routes, sensitive workflows, module mutations or new content-bearing SIPAT/NR-1 behavior.

## Write set

- `src/components/platform/navigation.ts`
- `tests/unit/platform/navigation.test.ts`
- `tests/unit/platform/sidebar-capability.test.tsx`
- `tests/e2e/platform-foundation.spec.ts`
- `tests/e2e/visual-ux.spec.ts`
- `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4-regrouping-scorecard.md`

## Behavior

- Admin base navigation now exposes Dra. Paola's Admin Master taxonomy through existing/safe destinations: `Dashboard geral`, `Empresas`, `Saude Primaria`, `Concierge`, `Dashboard de exames`, `Educacao`, `Gamificacao`, `Produtos e Modulos`, `Relatorios` and `Configuracoes`.
- Admin `Empresas` and `Configuracoes` use query shortcuts into the existing `/admin` tabbed panel; `/admin` now honors `?tab=empresas` and `?tab=sistema`.
- Sidebar active-state now receives the current query string and treats `/admin?tab=...` as a distinct Admin tab shortcut, so `Empresas` or `Configuracoes` can be active without also marking `Dashboard geral`.
- RH base navigation is grouped as `Dashboard`, `Pessoas`, `Educacao`, `Conquistas` and `Gestao`.
- RH `Conquistas` reuses existing `/desafios/gerenciar` and `/gamificacao-config`; no ranking, Liga or reward behavior was activated.
- Collaborator base navigation is grouped as `Meu bem-estar`, `Saude Primaria`, `Educacao` and `Conquistas`.
- Collaborator `Meu bem-estar` reuses `/colaboradora` and `/agenda`; `Educacao` reuses `/campanhas` and `/comunidade`; `Conquistas` reuses `/objetivos`, `/desafios` and `/conquistas`.
- Leadership base navigation is grouped as `Dashboard` and `Educacao`.
- Module-aware navigation from P2/P4A remains separate; locked modules still come from `company_modules`.
- NR-1 `requires_contract` rows are visible as a locked module shell at `/nr1`; only explicit `enabled` rows can reach `/avaliacao-nr1`.

## Validation

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx` | PASS; 3 files, 43 tests. |
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts` | PASS; 5 files, 76 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; 146 static pages. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted once. |

## Query active-state correction validation

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/sidebar-capability.test.tsx` | PASS; 3 files, 46 tests. |
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts` | PASS; 6 files, 61 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; 146 static pages. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted once. |
| `git diff --check` on P4 code/test files | PASS; LF/CRLF warnings only. |
| P4 trailing whitespace check | PASS. |

## Finding correction validation

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts` | PASS; 6 files, 59 tests. |
| `npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/company-modules-api.test.ts tests/unit/platform/navigation.test.ts` | PASS; 4 files, 60 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; 146 static pages. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted once. |

## Auth redirect correction validation

| Check | Result |
|---|---|
| In-app browser, already authenticated, opened `http://localhost:3001/auth?redirect=%2Fadmin` | PASS; final URL `http://localhost:3001/admin`, protected Admin shell rendered. |
| In-app browser, logged out, submitted `admin@uniher.com.br` through `http://localhost:3001/auth?redirect=%2Fadmin` | PASS; final URL `http://localhost:3001/admin`, protected Admin shell rendered. |
| `npm run test:unit -- tests/unit/platform/use-auth-scope.test.tsx` | PASS; 1 file, 20 tests. |
| `npm run test:unit -- tests/unit/platform/use-auth-scope.test.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/sidebar-capability.test.tsx tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts` | PASS; 7 files, 81 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; 146 static pages. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted once. |
| `git diff --check` | PASS; LF/CRLF warnings only. |

## Naming/profile consistency correction validation

| Check | Result |
|---|---|
| Admin platform settings label | PASS; `/admin?tab=sistema` now renders as `Sistema`, avoiding duplicate `Configuracoes` against the personal account route. |
| Personal settings label | PASS; `/configuracoes` now appears in personal navigation as `Minha conta`. |
| Profile role label for Admin Master | PASS; `/configuracoes` shows `Papel` as `Admin Master` for `admin@uniher.com.br`, not `Colaboradora`. |
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/role-label.test.ts` | PASS; 3 files, 33 tests. |
| `npm run test:unit -- tests/unit/platform/use-auth-scope.test.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/role-label.test.ts tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts` | PASS; 8 files, 84 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; 146 static pages. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted once. |

## Cross-panel naming/role projection audit

| Check | Result |
|---|---|
| Sidebar role labels | PASS; account footer and dual-role switcher now use the canonical role label helper instead of local `Master`/`Admin` labels. |
| Admin/user management labels | PASS; Admin user surfaces use the canonical helper for singular role labels. |
| Convites and Gestão de Colaboradoras labels | PASS; `rh` now renders as `Admin Empresa`, not generic `Admin`. |
| Invite acceptance and invite email labels | PASS; invitation role projection now uses the canonical helper. |
| Primeiro acesso labels | PASS; onboarding role summary now uses the canonical helper. |
| Duplicate navigation labels by role | PASS; regression renders Sidebar for `admin`, `rh`, `lideranca` and `colaboradora` and fails on duplicate visible link labels. |
| Source guard | PASS; regression blocks reintroducing local `rh: 'Admin'` and `admin: 'Master'` labels in user-facing panels covered by this audit. |
| Account settings error copy | PASS; `/configuracoes` error state now uses accented Portuguese copy: `Erro nas Configurações` and `configurações`. |
| `npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/role-label.test.ts` | PASS; 4 files, 55 tests. |
| `npm run test:unit -- tests/unit/platform/use-auth-scope.test.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/role-label.test.ts tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts` | PASS; 8 files, 90 tests. |
| `npx tsc --noEmit` | PASS. |
| `git diff --check` | PASS; LF/CRLF warnings only. |
| `npm run build` | PASS; 146 static pages. Existing Turbopack/NFT warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted once. |

## NR-1 default gate correction validation

| Check | Result |
|---|---|
| Default/gated NR-1 navigation | PASS; `requires_contract` points to `/nr1`, not `/avaliacao-nr1`. |
| Enabled NR-1 navigation | PASS; explicit `enabled` state can still point to `/avaliacao-nr1`. |
| Locked NR-1 shell | PASS; `/nr1` uses `ContainedSurfacePreview` and does not import COPSOQ/Yavix runtime. |
| Collaborator home NR-1 journey | PASS; `/colaboradora` no longer uses public entitlement env defaults and requires visible `enabled` NR-1 from `/api/company/modules` before exposing `/avaliacao-nr1`. |
| Direct NR-1 runtime/API gate | PASS; `/avaliacao-nr1` and `/api/yavix/copsoq/*` now require the canonical server-side visible/enabled NR-1 entitlement. |
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/module-shells.test.ts` | PASS; 2 files, 37 tests. |
| `npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts` | PASS; 5 files, 73 tests. |

## Privacy and governance checks

- No route was added to base navigation for sensitive module execution.
- RH/leadership base navigation still excludes personal Agenda, personal Semaforo, personal Objetivos and Liga.
- Collaborator base navigation still excludes Liga.
- No SIPAT lessons, campaigns, schedules, videos or materials were invented.
- No Yavix/NR-1 provisioning, scoring or result sync was added; `requires_contract`, collaborator-home defaults, direct `/avaliacao-nr1` and direct `/api/yavix/copsoq/*` calls no longer run COPSOQ unless the company has explicit visible/enabled NR-1.
- No module-management mutations were added.

## Decision

PASS after finding corrections for P4 regrouping and auth redirect validation. Next safe lane is either Admin/RH module-management governance or P5 check-out foundation, depending on product priority.
