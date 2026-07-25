# UniHER Paola P7B visual target decision

Date: 2026-07-24
Coordinator: current Codex session
Status: PASS for visual target extraction; HOLD for UI implementation

## Intent

Close the next safe continuation after P5/P6 by freezing the P7B visual gate
before any menu rewrite.

P7B exists because P7A proved the current navigation is functional, but did not
approve the richer menu-card/numbered visual treatment referenced by Dra.
Paola's screenshots.

## Harness Contract

- Source of truth:
  - Paola menu redesign contract
  - current-state scorecard
  - P7A menu boxes visual QA scorecard
  - operator handoff prompt
- Write allowlist for this decision lane:
  - this P7B plan
  - P7B scorecard
  - orchestration ledger
  - current-state scorecard status notes
- Write denylist:
  - no UI rewrite in this decision lane
  - no navigation taxonomy change
  - no public landing, metadata or email edits
  - no Semaforo, Liga/ranking, NR-1/Yavix, SIPAT, Concierge,
    Desenvolvimento Humano or Canal de Denuncias production behavior
  - no module-management mutations
  - no commit, push or deploy

## Decision

The product direction remains `REDESIGN`, and the visual target is now
extractable from local durable references.

Reason: the three visual references were attached by the operator and copied to
durable repo assets. P7B implementation still stays `HOLD` until opened as a
separate UI lane because this decision lane only extracts the design target.

Design source:

- `docs/superpowers/specs/2026-07-24-uniher-paola-p7b-menu-card-design.md`
- `docs/superpowers/assets/2026-07-24-paola-p7b/colaboradora-menu-reference.png`
- `docs/superpowers/assets/2026-07-24-paola-p7b/rh-menu-reference.png`
- `docs/superpowers/assets/2026-07-24-paola-p7b/admin-master-menu-reference.png`

## P7B Opening Criteria

Open UI implementation only when one of these is true:

1. A focused P7B UI implementation lane is explicitly opened against the design
   source above.
2. The lane carries the narrow implementation allowlist below.
3. Runtime screenshots are captured before and after the visual change.

## Future Implementation Allowlist

If P7B implementation is opened, keep the write set narrow:

- `src/components/platform/Sidebar.tsx`
- `src/components/platform/SidebarNavItem.tsx`
- `src/components/platform/Sidebar.module.css`
- `src/components/platform/navigation.ts` only if visual metadata is required
- focused sidebar/navigation tests
- P7B scorecard and ledger

Do not change data services, module entitlements, sensitive routes or dashboard
business metrics as part of visual treatment.

## Future Acceptance Gates

- Compare before/after desktop and mobile screenshots for Admin, RH and
  collaborator against the approved reference target.
- Preserve the existing route taxonomy from P1-P4.
- Preserve Admin Master query active-state behavior.
- Preserve module badge spacing and PT-BR labels.
- No duplicate visible sidebar labels except intentional mobile-bottom overlap.
- No horizontal overflow at 1440, 1024, 768 and 390 width checks.
- No fixed navigation occlusion at mobile top and bottom.
- No sensitive module activation or new RH/Admin individual health data.
- Focused unit tests, `npx tsc --noEmit`, `git diff --check` and production
  build must pass before promotion.

## Current Receipt

- P5 Check-out foundation is locally implemented.
- P6 first protected Check-in x Check-out aggregate foundation is locally
  implemented and audited.
- P7A runtime/menu evidence remains PASS for functionality and HOLD for visual
  approval.
- The three references are now durable repo assets.
- P7B design target was extracted into a Design MD spec.
- P7B implementation is not opened in this lane; it is ready for a separate UI
  implementation pass.
