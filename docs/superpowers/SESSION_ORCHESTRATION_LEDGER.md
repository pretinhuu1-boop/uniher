# UniHER session orchestration ledger

**Purpose:** live control file for accelerated UniHER redesign sessions.
**Coordinator rule:** this file is owned by the coordinator. Workers may read it. Workers update it only when explicitly assigned.

## Current Baseline

- Checkout: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
- Branch: `codex/uniher-wave3-collaborator-nr1`
- HEAD at ledger creation: `dbd44c0`
- Pre-existing untracked research: `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`
- Current visual redesign local work:
  - `src/components/platform/ContainedSurfacePreview.tsx`
  - `src/app/(platform)/semaforo/page.tsx`
  - `src/app/(platform)/objetivos/page.tsx`
  - `src/app/(platform)/desafios/page.tsx`
  - `src/app/(platform)/conquistas/page.tsx`
  - `src/app/(platform)/liga/page.tsx`
- Rule: preserve all listed local work unless the coordinator explicitly revises it after diff review.

## Canonical Documents

Every worker session must load:

- `docs/superpowers/specs/2026-07-21-uniher-accelerated-redesign-orchestration-design.md`
- `docs/superpowers/plans/2026-07-21-uniher-accelerated-redesign-orchestration.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- `docs/superpowers/research/2026-07-22-uniher-harness-loop-engineering-research.md`
- `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- `docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md`
- `docs/superpowers/plans/2026-07-21-uniher-final-delivery-roadmap.md`
- `docs/superpowers/plans/2026-07-21-uniher-pending-surfaces-orchestration.md`
- `docs/superpowers/audits/2026-07-21-uniher-end-to-end-production-redesign-audit.md`
- `docs/superpowers/specs/2026-07-21-uniher-waves5-10-decision-packet.md`

## Route And Lane Matrix

| Route | Current state | Lane owner | Promotion dependency | Notes |
| --- | --- | --- | --- | --- |
| `/colaboradora` | Functional/parcial | visual-primary-care | R6/check-out specs for deeper changes | Preserve check-in, safe missions and NR-1 preview labels. |
| `/agenda` | Functional | visual-primary-care | visual QA | Existing collaborator-self CRUD must remain private. |
| `/campanhas` | Functional/parcial | visual-education | visual QA | Can become Education hub visually without changing campaign APIs. |
| `/comunidade` | Wave 4 PASS | regression only | tenant/privacy regression | Do not reexecute Wave 4. |
| `/semaforo` | Contained visual redesign local | wave9-semaforo | clinical/privacy gate | No API/data activation before approval. |
| `/objetivos` | Functional self-only objectives local | wave6-objectives | PASS local validation | Stage only exact Wave 6 allowlist if user approves. |
| `/desafios` | Functional self-only company challenges local | wave7-challenges | PASS local validation | RH management route is separate and was not reactivated. |
| `/conquistas` | Functional private achievements local | wave8-achievements | PASS local validation | No legacy badges. |
| `/liga` | Contained visual redesign local | wave10-liga | policy approval + Waves 5 and 8 | Outside core unless formally approved. |
| `/avaliacao-nr1` | Scaffold | R2 NR-1 owner | Yavix payload/auth/scoring/consent | Do not mix with this redesign wave unless assigned. |

## Concurrency Rules

- Visual-only route work may run in parallel when write sets are disjoint.
- Migrations run serially under the coordinator.
- Wave 6, Wave 7 and Wave 8 implementation cannot promote before Wave 5.
- Semaforo and Liga are independent decision-gated lanes, not shortcuts around Wave 5.
- QA may run in parallel but cannot edit production code while reviewing.

## Harness/Loop Pilot Framework

Status: candidate framework. Apply it to new worker sessions now, but promote it to all future specs only after the pilot scorecard passes.

Pilot lane: `visual-contained-pages`.

Harness contract required for each worker:

- intent source;
- coordinator;
- worker lane;
- write allowlist;
- write denylist;
- runtime preflight;
- context pack;
- allowed commands;
- evidence outputs;
- verification gates;
- governance gates;
- stop conditions.

Worker loop required for each lane:

1. Preflight.
2. Observe.
3. Plan.
4. Act.
5. Verify.
6. Reflect.
7. Coordinator gate.

Promotion criteria:

- complete worker receipt;
- exact write-set containment;
- deterministic checks pass;
- screenshots exist for user-facing routes;
- independent QA has no unresolved P0/P1/P2;
- no public/auth/metadata/email/NR-1/Yavix scope drift;
- coordinator records PASS, HOLD, FAIL or BLOCKED with evidence.

## Active Lanes

| Lane | Owner/session | Status | Write set | Next gate |
| --- | --- | --- | --- | --- |
| orchestration | current session | in progress | docs/superpowers orchestration docs | scorecard |
| visual-contained-pages | current session/local work | PASS visual QA | five contained pages + `ContainedSurfacePreview.tsx` | stage only exact visual allowlist if user approves |
| wave5-ledger | current session | PASS foundation | Wave 5 ledger allowlist | explicit staging allowlist |
| wave6-objectives | current session | PASS local validation | Wave 6 objectives allowlist | explicit staging allowlist |
| wave7-challenges | current session | PASS local validation | Wave 7 challenge allowlist | explicit staging allowlist |
| wave8-achievements | current session | PASS local validation | Wave 8 achievements allowlist | explicit staging allowlist |
| wave9-semaforo | current session | PASS blocked/contained | docs scorecard only | clinical/privacy approval still required |
| wave10-liga | current session | PASS blocked/contained | docs scorecard only | product/legal policy approval still required |
| paola-menu-redesign-p0 | current session | PASS after P0.1 coverage correction | spec + scorecard + ledger | P1 orchestration may start docs-only; code remains blocked until dirty/divergent worktree is reconciled or allowlisted |
| paola-menu-redesign-p1-preflight | current session | PASS docs/inventory; superseded by P1 implementation PASS | orchestration plan + P1 preflight scorecard | closed |
| paola-menu-redesign-p1-implementation | current session | PASS | `060_company_modules.sql`, module types/helper, focused tests, scorecard | closed |
| paola-menu-redesign-p1a-content-inventory | current session | PASS inventory; SIPAT source unverified | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1a-content-inventory.md` | SIPAT source/content policy before content-bearing implementation |
| paola-menu-redesign-p2-navigation | current session | PASS | navigation contract, Sidebar badge fallback, focused tests, scorecard | closed |
| paola-menu-redesign-p3-shells | current session | PASS | six static contained module shells, tests, screenshots, scorecard | P4 existing surface regrouping or Sidebar data/API wiring |
| paola-menu-redesign-p4a-sidebar-data-wiring | current session | PASS after finding correction | read-only modules API with non-mutating default navigation rows, Sidebar module SWR, focused tests, scorecard | Admin/RH module-management governance |
| paola-menu-redesign-p4-regrouping | current session | PASS after finding corrections and auth redirect validation | base navigation regrouping plus Admin Master taxonomy shortcuts, focused tests, browser auth redirect evidence, scorecard | Admin/RH module-management governance or P5 check-out foundation |
| paola-doc-tree-validation | current session | PASS docs validity | doc tree validation scorecard | P1 implementation allowlist or P1A inventory |
| qa-independent | unassigned | waiting | receipts only | lane receipt request |

## Worker Receipt Schema

Every worker returns:

```markdown
### Receipt: <lane> / <date-time>

**Status:** PASS | FAIL | BLOCKED
**Objective:** <one sentence>
**Harness contract:** <intent source, lane, allowlist, denylist, preflight, context pack, commands, evidence, gates, stop conditions>
**Loop result:** <preflight, observe, plan, act, verify, reflect, coordinator gate readiness>
**Write set assigned:** <files/directories>
**Files read:** <list>
**Files changed:** <list>
**Commands run:**
- `<command>` -> PASS/FAIL, key counts
**Screenshots:**
- `<path or not applicable with reason>`
**Privacy/role checks:** <specific checks>
**Diff summary:** <short summary>
**Remaining gaps:** <list or none>
**Promotion recommendation:** promote | hold | blocked
```

## Coordinator Decisions

| Date | Decision | Evidence | Status |
| --- | --- | --- | --- |
| 2026-07-21 | Adopt centralized coordinator + bounded worker-session model for accelerated redesign. | `2026-07-21-uniher-accelerated-redesign-orchestration-design.md` | active |
| 2026-07-21 | Treat current five-page visual redesign as local work pending coordinator diff review; do not stage automatically. | git status + screenshots previously captured under projectless outputs | hold |
| 2026-07-22 | Adopt harness/loop engineering as candidate framework and pilot it first on `visual-contained-pages`. | `2026-07-22-uniher-harness-loop-engineering-research.md` | pilot |
| 2026-07-22 | Mark `visual-contained-pages` PASS for visual QA and promote harness/loop as the default framework for future UniHER specs. | `docs/superpowers/audits/2026-07-22-uniher-visual-contained-pages-pilot-scorecard.md` + independent QA re-review | active |
| 2026-07-22 | Hold `wave5-ledger` as decision-gated; do not create migration 056, participation service, repository or writer tests before the decision packet approvals are complete. | `docs/superpowers/audits/2026-07-22-uniher-wave5-ledger-preflight.md` + decision packet lines 3-33 | blocked |
| 2026-07-22 | Open `wave5-ledger` implementation under the recommended conservative v1: hard-delete, no metadata, no points/ranking and no sensitive sources. | operator decision "vamos com o recomendado" + `docs/superpowers/specs/2026-07-21-uniher-eligible-participation-ledger-design.md` | active |
| 2026-07-22 | Mark `wave5-ledger` PASS for foundation implementation; release Wave 6 and Wave 7 for child-plan execution. | `docs/superpowers/audits/2026-07-22-uniher-wave5-ledger-scorecard.md` + unit/privacy/typecheck/build evidence | active |
| 2026-07-22 | Close Wave 5 audit gaps: DSAR exports eligible participation, Admin/RH fulfilled deletion hard-deletes ledger rows, and producer service stays transaction-scoped. | `src/lib/privacy/dsar-export.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/api/rh/users/[id]/route.ts`, participation tests | active |
| 2026-07-22 | Mark `wave6-objectives` PASS local validation: self-only objectives, DSAR, fulfilled erasure, tests, typecheck, build and desktop/mobile screenshots. | `docs/superpowers/audits/2026-07-22-uniher-wave6-objectives-scorecard.md` + outputs `uniher-wave6-objectives-2026-07-22` | active |
| 2026-07-22 | Mark `wave7-challenges` PASS local validation: self-only company challenges, DSAR, fulfilled erasure, tests, typecheck, build and desktop/mobile screenshots. | `docs/superpowers/audits/2026-07-22-uniher-wave7-challenges-scorecard.md` + outputs `uniher-wave7-challenges-2026-07-22` | active |
| 2026-07-22 | Mark `wave8-achievements` PASS local validation: private deterministic achievements, DSAR, fulfilled erasure, tests, typecheck, build and desktop/mobile screenshots. | `docs/superpowers/audits/2026-07-22-uniher-wave8-achievements-scorecard.md` + outputs `uniher-wave8-achievements-2026-07-22` | active |
| 2026-07-22 | Mark `wave9-semaforo` and `wave10-liga` PASS blocked/contained: no production behavior activated; Semaforo/Liga remain decision-gated. | `docs/superpowers/audits/2026-07-22-uniher-wave9-10-blocked-scope-scorecard.md` | active |
| 2026-07-22 | Mark Dra. Paola menu redesign P0 PASS as docs-only route/module contract with global harness/loop execution model. | `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md` + `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p0-scorecard.md` | active |
| 2026-07-22 | Correct Dra. Paola menu redesign contract to full stakeholder coverage before implementation: absenteeism, presenteeism, rankings, rewards, medals, Concierge KPIs, exam dashboard, reports/ROI, admin settings and NR-1/SIPAT content-inventory claims. | `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md#9a-specification-coverage-audit` | active |
| 2026-07-22 | Start Dra. Paola menu redesign orchestration as docs/inventory only; P1 code remains HOLD until exact allowlist after preflight. | `docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md` | active |
| 2026-07-22 | Mark Paola P1 module entitlement preflight PASS for docs/inventory: use dedicated company-scoped `company_modules`, role visibility in typed registry, migration `060_company_modules.sql`; implementation remains HOLD. | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1-preflight.md` | active |
| 2026-07-22 | Add P1A content reconciliation before P3 shells because stakeholder said NR-1/SIPAT content already exists; current code inventory found NR-1 preview evidence but no dedicated SIPAT/Concierge/Denuncias/Human Development routes. | `docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md` + code-only rg evidence | active |
| 2026-07-22 | Validate Paola documentation tree after second pass: current references exist, planned P1 files are correctly absent, P0/P1/P1A state is coherent and implementation remains gated. | `docs/superpowers/audits/2026-07-22-uniher-paola-doc-tree-validation.md` | active |
| 2026-07-22 | Mark Paola P1A content inventory PASS for docs/inventory: NR-1 has a controlled preview/scaffold; SIPAT source content is unverified in this tree and must not be invented in P3. | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1a-content-inventory.md` | active |
| 2026-07-22 | Mark Paola P1 implementation PASS: added company module migration, typed module contract, helper and focused tests without changing navigation, routes or sensitive behavior. | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1-implementation-scorecard.md` + unit/typecheck/build evidence | active |
| 2026-07-22 | Mark Paola P2 navigation PASS: added module-aware navigation resolver and badge metadata while leaving current Sidebar runtime navigation unchanged. | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p2-navigation-scorecard.md` + navigation/sidebar/typecheck/build evidence | active |
| 2026-07-22 | Mark Paola P3 shells PASS: added static contained shells for Saude Primaria, Concierge, Viva SIPAT, Desenvolvimento Humano, Canal de Denuncias and Produtos e Modulos without activating workflows or invented SIPAT content. | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p3-shells-scorecard.md` + tests/build/screenshots | active |
| 2026-07-22 | Mark Paola P4A Sidebar data/API wiring PASS: added read-only company module endpoint and connected Sidebar to company-scoped module rows without mutations, default row creation on read or sensitive behavior activation. | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4a-sidebar-data-wiring-scorecard.md` + unit/privacy/typecheck/build evidence | active |
| 2026-07-22 | Mark Paola P4 regrouping PASS after auth redirect validation: base navigation now reuses existing routes under Dashboard, Educacao, Meu bem-estar/Agenda and Conquistas taxonomy without duplicate modules or sensitive behavior activation. | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4-regrouping-scorecard.md` + unit/privacy/typecheck/build/browser evidence | active |
| 2026-07-22 | Resolve Paola findings: module API now returns default visible navigation rows without DB writes, Admin Master navigation exposes the requested taxonomy through existing/shell destinations, `/admin?tab=...` opens the matching tab, and spec language now separates captured spec from runtime completion. | `src/app/api/company/modules/route.ts`, `src/lib/modules/company-modules.ts`, `src/components/platform/navigation.ts`, `src/app/(platform)/admin/page.tsx`, Paola docs/scorecards | active |
| 2026-07-22 | Resolve Paola Admin query active-state finding: Sidebar now includes search params in active-state resolution, `/admin?tab=...` shortcuts match exactly, and `/admin` Dashboard geral is not also active for query-specific Admin tabs. | `src/components/platform/Sidebar.tsx`, `src/components/platform/navigation.ts`, `tests/unit/platform/navigation.test.ts`, `tests/unit/platform/sidebar-navigation.test.tsx`, `tests/unit/platform/sidebar-capability.test.tsx` | active |
| 2026-07-22 | Resolve Paola auth redirect caveat: `/auth?redirect=%2Fadmin` now checks cookie-backed session when a safe redirect is present, uses a single post-auth target resolver, and browser validation reaches protected `/admin` both from existing session and fresh admin login. | `src/app/auth/page.tsx`, `src/hooks/useAuth.ts`, `tests/unit/platform/use-auth-scope.test.tsx`, in-app browser evidence, P4 scorecard | active |
| 2026-07-22 | Resolve Paola naming/profile consistency finding: Admin platform settings now renders as `Sistema`, personal settings renders as `Minha conta`, and `/configuracoes` maps admin profile role to `Admin Master` instead of collaborator fallback. | `src/components/platform/navigation.ts`, `src/components/platform/Sidebar.tsx`, `src/app/(platform)/configuracoes/page.tsx`, `src/lib/users/role-label.ts`, `tests/unit/platform/role-label.test.ts`, P4 scorecard | active |
| 2026-07-22 | Complete cross-panel naming/role projection audit: Sidebar, Admin, Convites, Gestão de Colaboradoras, invite acceptance, Primeiro Acesso and invite email now use canonical singular role labels; duplicate visible navigation labels are covered by regression tests. | `src/lib/users/role-label.ts`, user-facing panel imports, `tests/unit/platform/sidebar-capability.test.tsx`, `tests/unit/platform/role-label.test.ts`, P4 scorecard | active |
| 2026-07-23 | Close cross-panel correction plan execution: validated no divergent local singular role labels remain in covered panels, classified mobile `/configuracoes` label `Perfil` as intentional compact shortcut, and corrected `/configuracoes` error copy accents. | `docs/superpowers/plans/2026-07-22-uniher-cross-panel-consistency-correction.md`, `src/app/(platform)/configuracoes/error.tsx`, P4 scorecard, focused/relevant unit tests, typecheck, build | active |

## Promotion Checklist

Before any lane is marked PASS:

- [ ] Assigned write set matches actual changed files.
- [ ] No unrelated files are included.
- [ ] `git diff --check` is clean.
- [ ] TypeScript passes if source code changed.
- [ ] Focused unit/privacy tests pass.
- [ ] Build passes if app code changed.
- [ ] Harness contract is complete for the lane.
- [ ] Worker loop receipt covers preflight, observe, plan, act, verify and reflect.
- [ ] Desktop/mobile screenshots exist for user-facing route changes.
- [ ] Independent review has no unresolved P0/P1/P2.
- [ ] Scorecard is written under `docs/superpowers/audits/`.

## Open Risks

- The current worktree contains uncommitted visual redesign changes. New sessions must preserve them.
- Semaforo and Liga remain decision-gated; visual surfaces must not imply production activation.
- Wave 6 passed local validation and post-wave diff review; explicit staging allowlist is still required before commit/promotion.
- Wave 7 passed local validation and browser evidence; explicit staging allowlist is still required before commit/promotion.
- Wave 8 passed local validation and browser evidence; explicit staging allowlist is still required before commit/promotion.
- Wave 5 scheduled retention cleanup remains a future job spec, not an active background deletion process.
- NR-1/Yavix work remains outside this orchestration unless explicitly assigned to R2/R7 lanes.
- Visual wave staging must be allowlisted manually because orchestration/research docs are also untracked in the same worktree.
- SIPAT content claimed by stakeholder is not validated in this local tree; P3 must use sourced assets/content or an honest locked/source-needed shell.
- Module-management mutations remain unimplemented; P4A is read-only runtime consumption of default navigation rows overlaid by existing `company_modules` rows.
