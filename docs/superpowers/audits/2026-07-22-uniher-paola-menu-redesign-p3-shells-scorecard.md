# UniHER Paola menu redesign P3 locked shells scorecard

**Date:** 2026-07-22
**Lane:** `P3 Locked module shells`
**Decision:** PASS

## Harness contract

Intent source: Dra. Paola menu redesign contract, P1 module entitlement, P1A content inventory and P2 navigation contract.

Coordinator: current session.

Worker lane: `P3 Locked module shells`.

Write allowlist used:

- `src/app/(platform)/saude-primaria/page.tsx`
- `src/app/(platform)/concierge/page.tsx`
- `src/app/(platform)/viva-sipat/page.tsx`
- `src/app/(platform)/desenvolvimento-humano/page.tsx`
- `src/app/(platform)/canal-denuncias/page.tsx`
- `src/app/(platform)/produtos-modulos/page.tsx`
- `tests/unit/module-shells.test.ts`
- Paola docs/ledger updates required to register the receipt

Write denylist respected:

- module APIs, DB writers and entitlement mutations
- dashboard charts
- check-out data model
- Concierge case workflow
- Denuncias form/upload/integration
- SIPAT content that was not sourced
- Yavix, Semaforo, Liga or ranking behavior
- public landing, metadata and email surfaces
- pre-existing dirty product files not in the allowlist

## Implementation summary

P3 adds six static contained shells using the existing `ContainedSurfacePreview` pattern:

- `/saude-primaria`
- `/concierge`
- `/viva-sipat`
- `/desenvolvimento-humano`
- `/canal-denuncias`
- `/produtos-modulos`

Each shell states:

- what is allowed in this stage;
- what remains blocked;
- which governance/source condition must pass before real behavior.

The SIPAT shell is explicitly source-needed: it does not invent lessons, campaigns, videos, schedules or materials.

## Safety result

- No route has `fetch`, SWR, DB access, auth wrapper, form submit or API call.
- No real Concierge case workflow exists.
- No Denuncias receiving channel, upload, protocol, inbox or partner integration exists.
- No SIPAT content was invented.
- No product module toggle or activation control exists.
- Semaforo, Liga/ranking and Yavix remain contained by their prior gates.

## Commands run

| Command | Result |
|---|---|
| `npm run test:unit -- tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx` | PASS after tightening false-positive regex: 3 files, 34 tests. |
| `npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/module-shells.test.ts` | PASS: 3 files, 41 tests. |
| `npx tsc --noEmit` | PASS. |
| `npm run build` | PASS; new static routes included, total static pages increased from 139 to 145. Existing Turbopack/NFT trace warning remains around `next.config.ts` through `/api/admin/system/ops`, emitted twice. |

## Visual evidence

Local server:

- `http://localhost:3001`
- Started with temporary local-only `JWT_SECRET` and `JWT_REFRESH_SECRET` for authenticated visual validation.

Screenshots:

- `screenshots/paola-p3-shells-2026-07-22/desktop-saude-primaria.png`
- `screenshots/paola-p3-shells-2026-07-22/desktop-concierge.png`
- `screenshots/paola-p3-shells-2026-07-22/desktop-viva-sipat.png`
- `screenshots/paola-p3-shells-2026-07-22/desktop-desenvolvimento-humano.png`
- `screenshots/paola-p3-shells-2026-07-22/desktop-canal-denuncias.png`
- `screenshots/paola-p3-shells-2026-07-22/desktop-produtos-modulos.png`
- `screenshots/paola-p3-shells-2026-07-22/mobile-top-*.png`
- `screenshots/paola-p3-shells-2026-07-22/mobile-limits-*.png`

Note: Playwright full-page mobile screenshots showed a browser capture artifact with extra blank area because `documentElement` height stayed at viewport height while `body` was taller. Normal viewport screenshots at top and at the "Permitido nesta etapa" section validated the mobile layout.

## Loop result

Preflight: confirmed P3 starts after P2 PASS and SIPAT remains source-gated.

Observe: read existing `ContainedSurfacePreview`, Semaforo and Liga contained page patterns.

Plan: add static shells only, each with honest allowed/blocked copy.

Act: created six route pages and focused shell containment tests.

Verify: focused tests, containment tests, typecheck, build and visual screenshots passed.

Reflect: P3 gives the menu destinations a safe target, but the Sidebar still does not consume real company module data. P4/P5/P6 remain separate.

Coordinator gate: PASS. Next safe wave is P4 existing surface regrouping or the explicit data/API wiring needed to let Sidebar consume `company_modules`.
