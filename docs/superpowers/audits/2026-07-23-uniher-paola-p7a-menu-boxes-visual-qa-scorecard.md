# UniHER Paola P7A menu boxes visual QA scorecard

**Date:** 2026-07-23
**Lane:** P7A - Menu boxes visual QA
**Status:** HOLD for visual approval; PASS for runtime evidence capture and P7A polish
**Source:** Dra. Paola menu screenshots, operator screenshot of `/configuracoes`, current local runtime

## Harness

**Coordinator:** current session.
**Write allowlist used:** `src/components/platform/Sidebar.tsx`, `src/components/platform/SidebarNavItem.tsx`, `src/components/platform/navigation.ts`, `src/types/modules.ts`, contained/menu copy files under `src/app/(platform)`, focused navigation/sidebar tests, this scorecard, orchestration docs/ledger.
**Write denylist preserved:** public landing, email, metadata, Yavix/NR-1 provisioning, Semaforo production behavior, Liga/ranking production behavior, SIPAT content, Concierge cases and Canal de Denuncias workflow.
**Runtime:** `http://localhost:3001` with local QA secrets for auth only.
**Users:** `admin@uniher.com.br`, `rh@teste.com`, `colab@teste.com`.
**Evidence output:** `C:\Users\user\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-p7a-menu-boxes-2026-07-23`.

## Runtime evidence

Health:

```powershell
GET http://localhost:3001/api/health
```

Result: PASS, DB ok, 5 users, 1 company, write queue pending 0.

Screenshots captured:

- `admin-desktop.png`
- `admin-mobile.png`
- `admin-mobile-bottom.png`
- `rh-desktop.png`
- `rh-mobile.png`
- `rh-mobile-bottom.png`
- `colaboradora-desktop.png`
- `colaboradora-mobile.png`
- `colaboradora-mobile-bottom.png`
- `metrics.json`
- `mobile-bottom-metrics.json`
- `rh-dashboard-complete-desktop.png`
- `rh-dashboard-complete-mobile.png`
- `rh-dashboard-complete-metrics.json`

Evidence lineage correction:

- `metrics.json` and `mobile-bottom-metrics.json` are raw pre-polish capture
  artifacts from 13:51-13:55 and still contain old unaccented labels such as
  `Saude Primaria`, `Conteudos educativos` and `Configuracao de conquistas`.
- They are retained as historical runtime/overflow evidence, not as the final
  post-polish PT-BR copy source.
- `rh-dashboard-complete-metrics.json` is the post-polish completed-dashboard
  evidence source for corrected accented labels and badge spacing.

Runtime telemetry from raw pre-polish `metrics.json`:

- Admin: 12 nav links, no duplicates, active `Dashboard geral`, no horizontal overflow, no console/page/API errors.
- RH: 20 nav links, no duplicates, no horizontal overflow, no console/page/API errors.
- Collaborator: 19 nav links, no horizontal overflow, no console/page/API errors.
- Collaborator duplicate labels in raw metrics are from Sidebar plus MobileBottomNav (`Hoje`, `Comunidade`), not duplicate Sidebar entries.

Mobile scroll proof from `mobile-bottom-metrics.json`:

- Admin final link `Minha conta` visible above footer.
- RH final link `Minha conta` visible above footer.
- Collaborator final link `Minha conta` visible above footer.

Completed RH dashboard fixture proof from `rh-dashboard-complete-metrics.json`:

- Fixture used only Playwright route interception for `/api/rh/onboarding-status`; no DB/seed mutation.
- Desktop and mobile reached `http://localhost:3001/dashboard`.
- Active link: `Dashboard`.
- Horizontal overflow: `0`.
- `badJoinedText`: `[]`.
- `escapedUnicodeText`: `[]`.
- Sidebar labels render with PT-BR accents, including `Educação`, `Gestão`, `Módulos`, `Conteúdos educativos`, `Configuração de conquistas`, `Histórico`, `Comunicação`, `Saúde Primária`, `Canal de Denúncias`.

F0 evidence clarification:

- `rh-dashboard-complete-metrics.json` also contains `mojibakeText: ["ÃO", ...]` from an overbroad detector.
- This is classified as a false-positive because `ÃO` is valid PT-BR text, `badJoinedText` is empty, `escapedUnicodeText` is empty and the precise mojibake scan reported `real_mojibake_findings=0`.

## Correction made during P7A

Added a defensive active-state fallback in `SidebarNavigationGroups`:

- Primary active calculation remains the Next.js pathname/search value.
- Client-side fallback uses `window.location.pathname + window.location.search`.
- Regression added in `tests/unit/platform/sidebar-capability.test.tsx`.

Reason: during runtime audit, active-state behavior needed to remain robust after module-aware navigation data loads and client-side routing changes.

Added badge and PT-BR copy polish:

- `SidebarNavItem` now inserts a text separator before badge children, preventing raw text such as `DesafiosBloqueado`.
- Navigation/module labels now use accented PT-BR labels aligned with Dra. Paola's request.
- Dashboard, Histórico, Comunicação, contained module shells, first-access tour, selected configuration labels, upload error classification and the related auth error copy were cleaned from escaped unicode/mojibake drift.

## F0 findings closure

Status: PASS for F0 closure; full visual approval remains HOLD.

- Fixed the remaining contained shell context copy from `Saude Primaria` to `Saúde Primária`.
- Added a focused regression in `tests/unit/module-shells.test.ts` to assert the accented context and block the old unaccented value.
- Aligned the same shell test with the already-accented SIPAT source-needed copy.
- Updated this scorecard to classify valid `ÃO` entries in the RH completed-onboarding metrics as a detector false-positive, not a runtime encoding blocker.

## Validation commands

```powershell
npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/navigation.test.ts
npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/dashboard-view-model.test.ts tests/unit/platform/dashboard-export.test.ts tests/unit/platform/dashboard-charts.test.tsx
npx tsc --noEmit
npm run build
git diff --check
npm run test:unit -- tests/unit/module-shells.test.ts
```

Results:

- PASS: 6 focused test files.
- PASS: 69 tests.
- PASS: TypeScript.
- PASS: production build, 146 static pages generated; known Turbopack/NFT warning remains.
- PASS: `git diff --check` with line-ending warnings only.
- PASS: precise mojibake scan, `real_mojibake_findings=0`.
- PASS: module shell copy regression, 1 file / 9 tests.
- PASS: F0 focused suite, 4 files / 62 tests.
- PASS: evidence lineage clarification; old labels are isolated to raw
  pre-polish `metrics.json`, while post-polish labels are sourced from
  `rh-dashboard-complete-metrics.json`.

## Findings

### P1 - Visual fidelity is not yet approved

The current sidebar is a functional grouped navigation, not the rich menu-card/numbered visual language shown in Dra. Paola's three supplied mock references.

Impact: the current implementation is usable and aligned at the route/taxonomy level, but it should not be represented as visual approval of the requested redesign.

### P2 - RH local dashboard is gated by onboarding state - mitigated for visual proof

The local RH user reaches the RH onboarding experience from `/dashboard` because `/api/rh/onboarding-status` reports the company setup as incomplete.

Impact: the seeded local user still preserves the real onboarding redirect, but P7A now includes explicit completed-onboarding dashboard screenshots using route interception only.

### P2 - Module badges are compact but may read joined in raw text - resolved

Raw accessibility/text metrics no longer combine labels and badges. `rh-dashboard-complete-metrics.json` reports `badJoinedText: []`.

Impact: no remaining P7A blocker for badge spacing.

## Decision

P7A captured real runtime evidence and confirmed no immediate runtime, console, API, encoding, badge-spacing or overflow blocker in the menus. Full visual approval remains HOLD until a design correction/approval wave decides whether to keep the current grouped sidebar or implement a closer menu-card treatment inspired by Dra. Paola's references.

The primary `metrics.json` remains a raw pre-polish artifact and must not be
used alone to claim final PT-BR label correctness. Use
`rh-dashboard-complete-metrics.json` for the post-polish RH dashboard/menu label
evidence until a full recapture replaces the older metrics set.

Recommended next cut:

1. Decide visual target: keep current sidebar with polish, or move toward a richer card/numbered menu treatment.
2. Run a broader all-panels copy/encoding audit beyond the menu/dashboard surfaces if this becomes the next wave.
3. Keep Check-out and Check-in x Check-out dashboards separate from P7A; they remain product implementation work, not menu visual QA.
