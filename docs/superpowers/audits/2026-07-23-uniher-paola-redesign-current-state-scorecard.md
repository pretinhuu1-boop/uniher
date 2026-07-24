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
- Collaborator wellbeing pair `Check-in` + `Check-out`.
- RH/Admin `Check-in x Check-out` chart.
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
| Collaborator menu taxonomy | PARTIAL PASS | Agenda, Education, Objectives/Challenges/Achievements and locked modules exist; Check-out and real Semaforo remain pending. |
| Boxes/menu visual language | HOLD | Runtime screenshots exist and no overflow/API/console blocker was found, but the current grouped sidebar is not approved as the richer card/numbered reference treatment. |
| Quiz / Meu Bem-Estar | HOLD | Check-in exists and legacy quiz/lesson surfaces exist, but Dra. Paola's daily Check-in/Check-out pair is not complete. |
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
- PASS: the next lane should be selected explicitly as P7B visual target, P5 Check-out foundation or P8 module-management governance.

### P5 - Check-out foundation

Objective: add `Check-out` as a first-class wellbeing event before any comparison chart.

Acceptance gates:

- Check-in prompt answers "Como voce chega hoje?"
- Check-out prompt answers "Como voce encerra o seu dia?"
- No XP, ranking, Liga, Semaforo, health score or NR-1 feed.
- Self-only collaborator data access.
- Focused unit/privacy tests.
- Desktop/mobile screenshots after local server is available.

### P6 - RH/Admin aggregate dashboard

Objective: add approved aggregate indicators and `Check-in x Check-out` chart only after P5 exists.

Acceptance gates:

- Aggregate suppression.
- No individual mood, Semaforo, exam, agenda or NR-1 answer exposure.
- Dashboard view-model tests.
- Browser screenshots for RH/Admin.

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

### P8 - Module-management governance

Objective: add Admin/RH module activation/deactivation mutations only after explicit governance approval.

Acceptance gates:

- Audit log.
- Tenant isolation.
- No default row creation during reads.
- Explicit module status transitions.

## Coordinator decision

Continue from one explicitly selected lane: P5 Check-out foundation, P7B visual target correction, or P8 module-management governance. P7A runtime/menu evidence is closed, but full visual approval remains HOLD. Do not open SIPAT, Concierge, Denuncias, Semaforo production behavior, Liga/ranking or Yavix provisioning until their source/contract/policy gates are satisfied.
