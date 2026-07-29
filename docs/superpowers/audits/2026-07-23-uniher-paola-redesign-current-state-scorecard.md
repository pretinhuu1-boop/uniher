# UniHER Paola redesign current-state scorecard

**Date:** 2026-07-23
**Scope:** Dra. Paola menu redesign documentation, code inventory and current implementation status
**Decision:** HOLD for full redesign approval; P7A has PASS runtime evidence and remains HOLD for full visual approval
**Coordinator rule:** technical green is not visual/product approval

## Source pack

- Dra. Paola menu request and three visual references supplied by the operator.
- Obsidian note: `Mission/2026-07-22-uniher-paola-menu-redesign-spec.md`.
- Repo spec: `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`.
- Repo plan: `docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md`.
- Navigation source: `src/components/platform/navigation.ts`.
- Current route inventory under `src/app/(platform)`.

## Current evidence

Current checkout:

`C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`

Observed dirty files before this documentation update:

- `src/app/(platform)/configuracoes/config.module.css`
- `src/services/objectives.service.ts`

Focused documentation audit command:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/module-shells.test.ts tests/unit/company-modules.test.ts tests/unit/platform/dashboard-view-model.test.ts
```

Result:

- PASS: 4 test files.
- PASS: 41 tests.

Runtime gate:

```powershell
Invoke-WebRequest http://localhost:3001/api/health -UseBasicParsing -TimeoutSec 5
```

Result:

- FAIL/BLOCKED: local server did not respond in this audit round.
- Consequence: no fresh desktop/mobile browser approval is claimed here.

Operator visual evidence and P7A execution:

- 2026-07-23: the operator supplied an in-app screenshot showing the current `/configuracoes` state and highlighted duplicate/inconsistent settings taxonomy.
- Decision: this screenshot was sufficient to unblock the P7A menu boxes visual QA lane.
- P7A then captured reproducible desktop/mobile runtime screenshots for Admin, RH and collaborator.
- Limit: runtime evidence does not approve the richer card/numbered visual language from Dra. Paola's references.

## Decision summary

The redesign is partially aligned with Dra. Paola's request. It is not complete and must not be represented as fully approved.

Closed foundations:

- P1 company module entitlement foundation.
- P2 module-aware navigation contract.
- P3 locked/source-needed module shells.
- P4A read-only Sidebar module data wiring.
- P4 regrouping of existing surfaces into the requested taxonomy.
- Auth redirect and cross-panel naming corrections from previous review cycles.

Still in HOLD for final approval:

- Visual fidelity of the requested menu/box treatment from the three supplied images. P7A runtime/menu QA is executed, but the richer visual treatment remains not approved.
- RH/Admin `Check-in x Check-out` chart has a protected aggregate foundation and Admin Master selected-company scope, but visual/product approval remains HOLD.
- RH dashboard metrics for adherence, evolution, absenteeism, presenteeism and other approved business indicators.
- Real Semaforo/Saude Primaria behavior.
- Real Concierge case workflow.
- Content-bearing SIPAT implementation.
- Desenvolvimento Humano content/workflow.
- Partner-managed Canal de Denuncias flow.
- Module-management mutations for Admin/RH.
- Production RH/collaborator menu proof because valid production accounts are still required.

## Dra. Paola coverage status

| Area | Status | Reason |
|---|---|---|
| Admin Master menu taxonomy | PARTIAL PASS | Navigation exposes the requested taxonomy through existing/shell destinations; dedicated full routes remain future lanes. |
| RH menu taxonomy | PARTIAL PASS | Dashboard, Education, Conquistas and module shells are mapped; full indicators and sensitive modules remain gated. |
| Collaborator menu taxonomy | PARTIAL PASS | Agenda, Education, Objectives/Challenges/Achievements and locked modules exist; Check-out has P5 foundation; real Semaforo remains pending. |
| Boxes/menu visual language | HOLD | Runtime screenshots exist and no overflow/API/console blocker was found, but the current grouped sidebar is not approved as the richer card/numbered reference treatment. |
| Quiz / Meu Bem-Estar | P5 FOUNDATION PASS | Check-in and Check-out prompts now exist with controlled private wellbeing events; aggregate dashboard chart remains P6. |
| Education / Community | PARTIAL PASS | Code now has a real community/feed foundation; runtime seeded-content and visual proof remain separate gates. |
| Conquistas | PARTIAL PASS | Private objectives/challenges/achievements are advanced; Liga, ranking and rewards remain policy-gated. |
| NR-1 / Yavix | HOLD for production; PASS for default gate | Default `requires_contract` navigation now lands on locked `/nr1`; `/avaliacao-nr1` remains runtime scaffold requiring explicit enabled state and Yavix contract before production use. |
| SIPAT | HOLD | Visible/source-needed shell only; do not invent campaigns, schedules, materials or videos. |
| Canal de Denuncias | HOLD | Partner-managed shell only; no report intake/tracking workflow is active. |

## Required next waves

### F0 - Findings closure before next wave

Plan: `docs/superpowers/plans/2026-07-23-uniher-paola-findings-closure-plan.md`

Status: PASS.

Objective: close the small correctness/evidence findings found after P7A before opening a larger implementation lane.

Acceptance gates:

- PASS: `src/app/(platform)/saude-primaria/page.tsx` context copy is accented consistently with `Saúde Primária`.
- PASS: RH completed-onboarding metrics are annotated in the P7A scorecard as a detector false-positive for valid `ÃO`, not as a mojibake blocker.
- PASS: P7A remains labelled as runtime/menu evidence and `HOLD` for full visual approval.
- PASS: the next lane should be selected explicitly as P7B visual target, P6 selected-company Admin scope, or P8 module-management governance.

### P5 - Check-out foundation

Status: PASS for foundation; final promotion still requires build/diff gates for the active worktree.

Objective: add `Check-out` as a first-class wellbeing event before any comparison chart.

Acceptance gates:

- Check-in prompt answers "Como voce chega hoje?"
- Check-out prompt answers "Como você encerra o seu dia?"
- No XP, ranking, Liga, Semaforo, health score or NR-1 feed.
- Self-only collaborator data access.
- Focused unit/privacy tests.
- Desktop/mobile screenshots after local server is available.

### P6 - RH/Admin aggregate dashboard

Objective: add approved aggregate indicators and `Check-in x Check-out` chart only after P5 exists.

Status: PASS for first protected aggregate foundation and Admin Master selected-company scope; HOLD for full visual/product approval.

Acceptance gates:

- PASS: aggregate suppression for check-in/check-out counts and monthly series, including adjacent-month stable-cohort protection.
- PASS: no individual mood, Semaforo, exam, agenda or NR-1 answer exposure in the P6 projection.
- PASS: dashboard projection, view-model, CSV and component tests.
- PASS: RH browser screenshots after local server became available.
- PASS: Admin Master visual proof for this slice now fails closed with explicit company-scope copy when no company is selected.
- PASS: Admin Master selected-company reporting scope exists; `/dashboard` loads protected aggregates only after explicit company selection.
- PASS: RH/company-scoped users cannot override company scope via dashboard query.

### P7A - Menu boxes visual QA

Status: PASS for runtime/menu evidence; HOLD for full visual approval.

Objective: compare the implemented navigation/menu treatment against the three supplied visual references and the operator's current-runtime screenshot.

Acceptance gates:

- PASS: Desktop and mobile screenshots for Admin, RH and collaborator were captured in P7A.
- PASS: No duplicate `Configuracoes` taxonomy confusion remains in the P7A post-polish RH completed-dashboard metrics.
- PASS: Active-state fallback and query route behavior are covered by focused tests.
- PASS: P7A reported no overflow, console, page or API blocker in captured menus.
- PASS: P7A evidence lineage is now explicit: raw `metrics.json` is pre-polish,
  while `rh-dashboard-complete-metrics.json` is the post-polish label source.
- HOLD: visual fidelity to the richer card/numbered menu references is not approved.

### P7B - Visual target decision

Status: PASS for visual target extraction and local focused Sidebar UI implementation; HOLD for final product visual approval.

Plan: `docs/superpowers/plans/2026-07-24-uniher-paola-p7b-visual-target-decision.md`

Acceptance gates:

- PASS: the next visual lane is separated from P5/P6 data/privacy work.
- PASS: no sensitive module behavior is needed for the visual decision.
- PASS: the three Dra. Paola visual references were copied into durable repo
  assets.
- PASS: Design MD extraction exists at
  `docs/superpowers/specs/2026-07-24-uniher-paola-p7b-menu-card-design.md`.
- PASS: focused Sidebar UI implementation stayed scoped to visual shell,
  SidebarNavItem, CSS and layout offset, without changing module gates.
- PASS: Admin/RH/collaborator desktop evidence and collaborator mobile drawer
  evidence exist under `docs/superpowers/evidence/`.
- HOLD: final visual approval still requires operator/product review of the
  runtime screenshots.

### P8 - Module-management governance

Objective: add Admin/RH module activation/deactivation mutations only after explicit governance approval.

Status: PREFLIGHT PASS; IMPLEMENTATION HOLD.

Plan: `docs/superpowers/plans/2026-07-24-uniher-paola-p8-module-management-governance.md`

Preflight scorecard: `docs/superpowers/audits/2026-07-24-uniher-paola-p8-module-management-preflight-scorecard.md`

Acceptance gates:

- PASS: canonical `company_modules` table, typed module slugs/states and
  read-only company-scoped API exist.
- PASS: current read API overlays defaults in memory and does not create rows
  on read.
- PASS: mutation helper exists but is not exposed by an approved endpoint.
- HOLD: implementation requires explicit approval because module mutations can
  alter entitlements.
- HOLD: future writes must include audit log, tenant isolation, explicit status
  transitions and no sensitive workflow activation.

## Coordinator decision

P6 selected-company Admin reporting scope and P8 governance preflight are now documented. Continue only with an explicitly approved implementation lane: P8 module-management mutations, a small visual polish lane after operator review, or another named data/product lane. P7A runtime/menu evidence is closed, but full visual approval remains HOLD. Do not open SIPAT, Concierge, Denuncias, Semaforo production behavior, Liga/ranking or Yavix provisioning until their source/contract/policy gates are satisfied.
