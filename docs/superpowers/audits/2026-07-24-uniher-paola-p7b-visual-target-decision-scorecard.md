# UniHER Paola P7B visual target decision scorecard

Date: 2026-07-24
Lane: P7B - visual target decision + focused sidebar UI implementation
Decision: PASS for visual target extraction and local sidebar implementation; HOLD for final product visual approval

## Summary

P7B was opened as a decision gate after P5/P6 passed technical validation. The
operator supplied the three visual references, they were copied into durable
repo assets, and the target was extracted into a Design MD spec. UI
implementation was later opened by the operator's continuation and executed as
a focused sidebar/navigation visual lane.

## Evidence Reviewed

- `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`
- `docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md`
- `docs/superpowers/plans/2026-07-23-uniher-paola-findings-closure-plan.md`
- `docs/superpowers/specs/2026-07-24-uniher-paola-p7b-menu-card-design.md`
- `docs/superpowers/assets/2026-07-24-paola-p7b/colaboradora-menu-reference.png`
- `docs/superpowers/assets/2026-07-24-paola-p7b/rh-menu-reference.png`
- `docs/superpowers/assets/2026-07-24-paola-p7b/admin-master-menu-reference.png`
- `docs/superpowers/evidence/p7b-sidebar-admin-desktop.png`
- `docs/superpowers/evidence/p7b-sidebar-rh-desktop.png`
- `docs/superpowers/evidence/p7b-sidebar-colaboradora-desktop.png`
- `docs/superpowers/evidence/p7b-sidebar-colaboradora-mobile.png`
- `C:\Users\user\.codex\attachments\3e01170e-173f-4a99-b996-5fc0bf768a4e\pasted-text.txt`
- `C:\Users\user\.codex\attachments\pasted-text-attachments.json`

## Findings

- PASS: P7A already captured functional runtime evidence for Admin, RH and
  collaborator navigation.
- PASS: P5 and P6 are no longer blockers for opening the visual decision gate.
- PASS: no source/contract-gated module needs to be activated for P7B.
- PASS: the actual three visual references are now available as local durable
  image artifacts.
- PASS: Design MD extraction defines the color, layout, component and
  role-specific targets.
- PASS: visual implementation lane was opened and stayed scoped to Sidebar,
  SidebarNavItem, Sidebar CSS, AppLayout shell offset and focused sidebar tests.
- PASS: runtime screenshots exist for Admin, RH, collaborator desktop and
  collaborator mobile drawer.
- PASS: follow-up fidelity correction widened the desktop panel to an inset
  editorial sidebar with rounded corners, larger brand block, larger icon rail
  and matching AppLayout offset.
- PASS: presentation-only detail bullets were added to the emphasized active
  menu items where they improve match to the references, while avoiding
  duplicated runtime descriptions and without creating new navigation targets.
- PASS: mobile drawer evidence was recaptured after animation settle; the drawer
  opens at `left=0`, width `340px`, without horizontal overflow.
- HOLD: menu content remains runtime/state-driven. The implementation does not
  copy reference-only entries or contracted-module labels when the product
  contract/module state does not expose them.
- HOLD: final product visual approval still requires operator/Dra. Paola review
  of the runtime screenshots.

## Governance Boundary

P7B is visual only. It must not change:

- wellbeing event storage or dashboard projection
- Semaforo production behavior
- Liga/ranking behavior
- NR-1/Yavix runtime or provisioning
- SIPAT, Concierge, Desenvolvimento Humano or Canal de Denuncias workflows
- module activation/deactivation mutations

## Validation

Commands:

```powershell
rg -n "P7B|visual target|richer card|numbered|menu-card|HOLD|KEEP|REDESIGN" docs/superpowers -S
Get-ChildItem -LiteralPath 'C:\Users\user\.codex\attachments' -Recurse -File
Get-ChildItem -LiteralPath 'docs/superpowers/assets/2026-07-24-paola-p7b'
git diff --check
npx vitest run tests/unit/platform/sidebar-navigation.test.tsx
npx tsc --noEmit
npm run build
```

Result:

- PASS: existing docs consistently mark visual approval as HOLD.
- PASS: durable P7B assets exist under
  `docs/superpowers/assets/2026-07-24-paola-p7b`.
- PASS: Design MD exists under
  `docs/superpowers/specs/2026-07-24-uniher-paola-p7b-menu-card-design.md`.
- PASS: `git diff --check` passed with line-ending warnings only.
- PASS: focused sidebar unit suite passed `8/8`.
- PASS: TypeScript passed with `npx tsc --noEmit`.
- PASS: `npm run build` passed. Remaining warning is the existing Turbopack NFT
  trace through `next.config.ts` and `src/app/api/admin/system/ops/route.ts`.
- PASS: Playwright runtime capture used `http://localhost:3001`; `127.0.0.1`
  was avoided because the active Next dev server blocks HMR cross-origin from
  that host.
- PASS: final screenshot metrics: desktop sidebars render `left=12`, `width=384`,
  `height=1076` at `1440x1100`; mobile drawer renders `left=0`, `width=340` at
  `390x844`.
- PASS: latest screenshot nav metrics after presentation-detail correction:
  Admin `scrollHeight=1662/clientHeight=868`, RH `2056/816`, collaborator
  desktop `1746/816`, collaborator mobile `1450/619`. Scroll remains expected
  because runtime RH/Admin expose more route groups than the static reference
  card, and the footer remains outside the scrollable nav.

## Decision

Coordinator decision: `PASS` for visual target extraction and local focused
sidebar UI implementation. `HOLD` remains for final product visual approval.

Next allowed move: independent/product visual review of the saved screenshots,
then a small polish lane if the operator rejects spacing, width, copy density or
role-specific menu hierarchy.
