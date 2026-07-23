# UniHER Paola menu redesign P0 scorecard

**Date:** 2026-07-22
**Lane:** `P0 Spec and route contract`
**Decision:** PASS after P0.1 coverage correction

## Harness contract

Intent source: Dra. Paola's 2026-07-22 menu request, Obsidian Paola spec, production/admin inspection, `origin/main`, current local worktree evidence and global harness/loop canon.

Coordinator: current session.

Worker lane: `P0 Spec and route contract`.

Write allowlist:

- `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p0-scorecard.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- `docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md`

Write denylist:

- `src/**`
- `data/**`
- `.next/**`
- production/deploy files
- public landing, metadata, email surfaces
- Yavix provisioning behavior
- Semaforo production behavior
- Liga production behavior
- clinical/legal/partner workflows

Runtime preflight:

- Branch observed: `codex/uniher-wave3-collaborator-nr1`.
- Local dirty files existed before P0: `src/app/(platform)/company-profile/page.tsx`, `src/services/objectives.service.ts`, untracked `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`.
- P0 did not touch pre-existing code changes.

Context pack:

- Obsidian note `Mission/2026-07-22-uniher-paola-menu-redesign-spec.md`.
- `docs/superpowers/specs/2026-07-21-uniher-accelerated-redesign-orchestration-design.md`.
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`.
- `docs/superpowers/research/2026-07-22-uniher-harness-loop-engineering-research.md`.
- Production health/admin menu observations from the current session.

Allowed commands:

- targeted `rg` / file reads
- `git status --short --branch`
- `git diff --check` on the P0 write set

Evidence outputs:

- this scorecard
- repo spec
- command results in session

Verification gates:

- docs-only write set
- no source/runtime behavior changed
- privacy and governance gates preserved in the spec

Governance gates:

- P1 implementation and P2 cannot start without explicit write allowlist.
- Semaforo, Liga, NR-1/Yavix, Concierge, SIPAT, Desenvolvimento Humano and Denuncias remain decision/contract gated.

Stop condition: PASS for P0 docs-only artifact.

## Loop result

Preflight: checked branch and dirty worktree; identified pre-existing modifications and untracked Yavix research.

Observe: read Obsidian Paola spec and the current orchestration spec style.

Plan: create a repo-side executable spec, P0 scorecard and a gated orchestration plan.

Act: added this scorecard, the Paola menu redesign contract, the coordinator ledger registration and the P1 orchestration plan. P0.1 then corrected the contract to explicitly cover every stakeholder bullet: absenteeism, presenteeism, rankings, rewards, medals, Concierge indicators, exam dashboard details, reports/ROI, admin settings and "content already available" inventory claims for NR-1/SIPAT.

Verify: run `git diff --check` on the P0/P1 docs write set before closing.

Reflect: P0 is a planning artifact only. It creates no runtime behavior and does not unblock sensitive modules.

Coordinator gate: P1 implementation remains blocked until the coordinator reconciles the dirty/divergent worktree or explicitly names the next write allowlist. P1 docs-only preflight is allowed when its write set is limited to scorecards/plans.

## Decision

PASS after P0.1 coverage correction.

## Verification

| Check | Result |
|---|---|
| `git diff --check -- docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p0-scorecard.md docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md` | PASS; only LF/CRLF normalization warning on `SESSION_ORCHESTRATION_LEDGER.md`. |
| `git status --short --branch` | Confirms P0 changed only docs plus pre-existing dirty files: `company-profile`, `objectives.service`, and untracked Yavix research remain outside P0. |

## P0.1 Coverage Audit

Initial P0 was directionally correct but under-specified against Dra. Paola's full list. P0.1 corrected the repo contract by adding an explicit specification coverage audit and missing stakeholder details:

- RH Dashboard: absenteeism, presenteeism, adherence, evolution and full metric/charts language.
- RH/Admin Conquistas/Gamificacao: general ranking, team ranking, rewards, medals and leagues vocabulary while preserving privacy gates.
- Concierge: status, pending items, response time and performance indicators.
- Dashboard de Exames: in-day, pending, expired, evolution and prevention indicators.
- Admin Relatorios: per-company, consolidated, export, impact and ROI.
- Admin Configuracoes: UniHER admins, access permissions and general settings.
- NR-1/SIPAT collaborator content: stakeholder's "content already available" claim is now an explicit inventory requirement before rebuilding.

Do not stage, commit, PR, push, deploy or start implementation automatically from this scorecard.
