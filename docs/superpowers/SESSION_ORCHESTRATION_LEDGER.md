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
- `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`
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
| `/conquistas` | Functional private achievements local | wave8-achievements | PASS after revocation correction | No legacy badges; mobile bottom visual evidence remains historical/weak until recaptured. |
| `/liga` | Contained visual redesign local | wave10-liga | policy approval + Waves 5 and 8 | Outside core unless formally approved. |
| `/nr1` | Locked module shell | Paola P4A/P4 correction | PASS after default gate correction | `requires_contract` module rows land here; no COPSOQ/Yavix runtime. |
| `/avaliacao-nr1` | Runtime scaffold | R2 NR-1 owner | explicit enabled module + Yavix payload/auth/scoring/consent | Do not expose from default `requires_contract` rows. |

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
| visual-contained-pages | current session/local work | historical PASS; current routes superseded | five contained-page screenshots + `ContainedSurfacePreview.tsx` | do not use old screenshots as current approval for Wave 6/7/8 functional routes |
| wave5-ledger | current session | PASS foundation | Wave 5 ledger allowlist | explicit staging allowlist |
| wave6-objectives | current session | PASS local validation | Wave 6 objectives allowlist | explicit staging allowlist |
| wave7-challenges | current session | PASS local validation after scorecard count correction | Wave 7 challenge allowlist | explicit staging allowlist |
| wave8-achievements | current session | PASS after revocation correction | Wave 8 achievements allowlist + scorecard update | explicit staging allowlist; recapture mobile bottom evidence if final visual approval depends on it |
| wave9-semaforo | current session | PASS blocked/contained | docs scorecard only | clinical/privacy approval still required |
| wave10-liga | current session | PASS blocked/contained | docs scorecard only | product/legal policy approval still required |
| paola-menu-redesign-p0 | current session | PASS after P0.1 coverage correction | spec + scorecard + ledger | P1 orchestration may start docs-only; code remains blocked until dirty/divergent worktree is reconciled or allowlisted |
| paola-menu-redesign-p1-preflight | current session | PASS docs/inventory; superseded by P1 implementation PASS | orchestration plan + P1 preflight scorecard | closed |
| paola-menu-redesign-p1-implementation | current session | PASS | `060_company_modules.sql`, module types/helper, focused tests, scorecard | closed |
| paola-menu-redesign-p1a-content-inventory | current session | PASS inventory; SIPAT source unverified | `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1a-content-inventory.md` | SIPAT source/content policy before content-bearing implementation |
| paola-menu-redesign-p2-navigation | current session | PASS | navigation contract, Sidebar badge fallback, focused tests, scorecard | closed |
| paola-menu-redesign-p3-shells | current session | PASS | six static contained module shells, tests, screenshots, scorecard | P4 existing surface regrouping or Sidebar data/API wiring |
| paola-menu-redesign-p4a-sidebar-data-wiring | current session | PASS after NR-1 default gate correction | read-only modules API with non-mutating default navigation rows, Sidebar module SWR, focused tests, scorecard | Admin/RH module-management governance |
| paola-menu-redesign-p4-regrouping | current session | PASS after NR-1 default gate correction | base navigation regrouping plus Admin Master taxonomy shortcuts, focused tests, browser auth redirect evidence, scorecard | Admin/RH module-management governance or P5 check-out foundation |
| paola-redesign-current-state | current session | HOLD for full Dra. Paola approval; P7A runtime/menu evidence closed | docs current-state scorecard, operator screenshot, P7A scorecard and Obsidian note | P5 Check-out foundation, P7B visual target correction or P8 module-management governance |
| paola-p7a-menu-boxes-visual-qa | current session | HOLD for visual approval; PASS runtime evidence + evidence lineage correction | screenshots, raw pre-polish metrics, RH post-polish completed fixture proof, Sidebar active/badge fallback, PT-BR copy cleanup, focused tests | decide visual target for richer Dra. Paola menu-card treatment |
| paola-p6-rh-admin-aggregates | current session | PASS aggregate foundation + Admin selected-company scope; HOLD full visual approval | protected dashboard projection, dashboard view/CSV/component tests, RH desktop/mobile screenshots, Admin Master selector/API/browser proof | full product visual approval or next approved governance lane |
| paola-p7b-visual-target-decision | current session | PASS local sidebar implementation after fidelity + content-hierarchy correction; HOLD final product visual approval | P7B Design MD, durable collaborator/RH/Admin Master reference assets, widened inset sidebar/AppLayout offset, presentation-only emphasis bullets, focused tests, desktop/mobile screenshots | independent/product review of P7B screenshots; menu hierarchy remains runtime/module-state driven |
| paola-doc-tree-validation | current session | PASS docs validity; superseded for current state | doc tree validation scorecard | closed; superseded by P1/P1A/P3/P4A/P4/P7A/F0 |
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
| 2026-07-22 | Mark `visual-contained-pages` historical PASS for visual QA and promote harness/loop as the default framework for future UniHER specs. Current `/objetivos`, `/desafios` and `/conquistas` states are superseded by Waves 6/7/8. | `docs/superpowers/audits/2026-07-22-uniher-visual-contained-pages-pilot-scorecard.md` + independent QA re-review | active |
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
| 2026-07-23 | Reconcile Dra. Paola redesign after new screenshots/request review: P1-P4 technical foundations remain PASS, but full redesign approval is HOLD because menu boxes visual proof, Check-out, Check-in x Check-out dashboards, RH/Admin aggregate indicators and source/contract-gated modules remain incomplete. | `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md` + Obsidian MCP update `Mission/2026-07-22-uniher-paola-menu-redesign-spec.md` | hold |
| 2026-07-23 | Accept operator-supplied screenshot as enough evidence to unblock P7A menu boxes visual QA execution; keep PASS blocked until reproducible desktop/mobile runtime screenshots exist. | operator screenshot of current `/configuracoes` state + `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md` | active |
| 2026-07-23 | Execute P7A runtime menu/boxes QA: captured Admin/RH/collaborator desktop/mobile/top-bottom evidence, confirmed no console/API/overflow blocker, added defensive Sidebar active-state fallback, and kept full visual approval on HOLD because current sidebar is functional grouped navigation rather than Dra. Paola's richer menu-card visual language. | `docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md` + outputs `uniher-p7a-menu-boxes-2026-07-23` + focused tests/typecheck | hold |
| 2026-07-23 | Close P7A polish continuation: fixed module badge text separation, aligned menu/module labels to accented PT-BR, cleaned escaped unicode/mojibake drift in dashboard and related platform copy, and captured RH dashboard completed-onboarding proof using Playwright route interception only. | `src/components/platform/SidebarNavItem.tsx`, `src/components/platform/navigation.ts`, `src/types/modules.ts`, focused platform copy files, `rh-dashboard-complete-*.png/json`, 69 focused tests, `npx tsc --noEmit` | hold |
| 2026-07-23 | Audit Paola P7A/P5/P6 readiness against the plan and create the findings closure plan: F0 must close the remaining Saude Primaria accent/evidence ambiguity before opening P5, P7B or P8. | `docs/superpowers/plans/2026-07-23-uniher-paola-findings-closure-plan.md` | active |
| 2026-07-23 | Close Paola F0 findings lane: fixed `Saude Primaria` context copy, added module-shell regression, annotated RH metrics `ÃO` as detector false-positive, and corrected current-state status so P7A is runtime PASS but visual HOLD. | `src/app/(platform)/saude-primaria/page.tsx`, `tests/unit/module-shells.test.ts`, F0 plan, P7A/current-state scorecards | active |
| 2026-07-23 | Create post-audit correction plans for waves with findings: Wave 8 revocation idempotency, Paola NR-1 default gate, visual-contained current-state reconciliation, Wave 7 count drift, P7A metrics refresh and Paola doc-tree next-gate drift. | `docs/superpowers/plans/2026-07-23-uniher-post-audit-findings-correction-orchestration.md` + six lane plans | active |
| 2026-07-23 | Close Wave 8 revocation finding: added RED/GREEN coverage for repeated sync after event revocation, kept `revoked` from downgrading to `in_progress`, and downgraded historical mobile top/bottom screenshot evidence instead of treating byte-identical captures as independent proof. | `src/repositories/achievements.repository.ts`, `tests/unit/private-achievements.test.ts`, Wave 8 scorecard, focused unit/privacy tests | active |
| 2026-07-23 | Close Paola NR-1 default gate finding: added locked `/nr1` shell, routed `requires_contract` NR-1 module rows away from `/avaliacao-nr1`, and kept COPSOQ runtime reachable only for explicit `enabled` rows. | `src/components/platform/navigation.ts`, `src/app/(platform)/nr1/page.tsx`, navigation/module-shell tests, P4A/P4 scorecards | active |
| 2026-07-23 | Close NR-1 collaborator-home bypass found in review: `/colaboradora` now derives NR-1 runtime entitlement from `/api/company/modules` and `isNr1RuntimeEntitled`, not from public entitlement env defaults; `/nr1` shell copy was accented. | `src/app/(platform)/colaboradora/page.tsx`, `src/lib/nr1/preview-state.ts`, `src/app/(platform)/nr1/page.tsx`, `tests/unit/nr1-preview-state.test.ts`, `tests/unit/module-shells.test.ts` | active |
| 2026-07-23 | Close P7A evidence refresh finding: classified raw `metrics.json` as pre-polish, made `rh-dashboard-complete-metrics.json` the post-polish label source, and preserved full visual approval as HOLD. | P7A scorecard, current-state scorecard, P7A evidence refresh plan, output-directory rg evidence | active |
| 2026-07-23 | Close Wave 7 scorecard count drift: reran the focused challenge/privacy suite and updated the scorecard from 52 to 53 tests passed. | Wave 7 scorecard + `npm run test:unit -- tests/unit/company-challenges.test.ts tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts` | active |
| 2026-07-23 | Close Paola doc-tree next-gates drift: marked the historical doc-tree lane closed/superseded and clarified that the 2026-07-22 route inventory predates P3 shells and later corrections. | `docs/superpowers/audits/2026-07-22-uniher-paola-doc-tree-validation.md`, ledger row update | active |
| 2026-07-23 | Close visual-contained current-state reconciliation: preserved the 2026-07-22 pilot as historical PASS, kept `/semaforo` and `/liga` contained, and routed `/objetivos`, `/desafios`, `/conquistas` approval to Wave 6/7/8 evidence. | visual-contained scorecard + ledger row update | active |
| 2026-07-23 | Close NR-1 direct runtime/API bypass: added canonical server-side `company_modules` entitlement guard, redirected direct `/avaliacao-nr1` access to `/nr1` unless NR-1 is explicitly visible/enabled, and blocked all `/api/yavix/copsoq/*` endpoints with 403 for non-entitled companies. | `src/lib/nr1/runtime-entitlement.ts`, `/avaliacao-nr1`, COPSOQ API routes, `tests/unit/nr1-runtime-entitlement.test.ts`, 76 focused tests | active |
| 2026-07-23 | Open and implement P5 Check-out foundation: added private `wellbeing_events`, collaborator check-in/check-out prompts with controlled mood values, check-out API/status, DSAR export, and tests proving no points/ranking/Semáforo writes. | `061_wellbeing_events.sql`, `src/services/wellbeing.service.ts`, `/api/wellbeing/*`, `/colaboradora`, `tests/unit/wellbeing-events.test.ts`, focused privacy gates | active |
| 2026-07-24 | Open P6 first RH/Admin aggregate foundation: protected dashboard now exposes only distinct aggregate `Check-in` and `Check-out` counts/series with minimum-cohort and complementary suppression; no mood or individual event rows are serialized. | `src/services/dashboard.service.ts`, dashboard view/export/component updates, `tests/unit/privacy/report-projection.test.ts`, P6 scorecard, focused tests/typecheck | hold |
| 2026-07-24 | Resolve P7B visual-reference blocker: copied the three supplied references into durable repo assets and extracted the menu-card/numbered visual target into Design MD; UI implementation remains a separate HOLD lane. | `docs/superpowers/specs/2026-07-24-uniher-paola-p7b-menu-card-design.md`, P7B assets, P7B scorecard | hold |
| 2026-07-24 | Execute focused P7B sidebar UI lane: implemented premium burgundy menu-card styling, role-specific numbering/chevrons, visible descriptions and brand header while preserving navigation routes/module gates; captured Admin/RH/collaborator desktop plus collaborator mobile evidence. | `src/components/platform/Sidebar.tsx`, `src/components/platform/SidebarNavItem.tsx`, `src/components/platform/Sidebar.module.css`, `tests/unit/platform/sidebar-navigation.test.tsx`, `docs/superpowers/evidence/p7b-sidebar-*.png`, P7B scorecard | hold |
| 2026-07-24 | Correct P7B fidelity after image-vs-runtime review: widened desktop sidebar to a 384px inset rounded panel, moved AppLayout desktop offset to 416px, enlarged brand/icon/row rhythm, compacted RH rows, and recaptured desktop/mobile evidence without changing navigation routes or gated module behavior. | `src/components/platform/Sidebar.module.css`, `src/components/platform/AppLayout.module.css`, `docs/superpowers/evidence/p7b-sidebar-*.png`, P7B scorecard, focused tests/typecheck/build | hold |
| 2026-07-24 | Correct P7B content hierarchy after screenshot review: added `SidebarNavItem` presentation details and kept them as emphasis bullets only for active high-signal items, avoiding duplicated runtime descriptions and reference-only contracted-module claims. | `src/components/platform/Sidebar.tsx`, `src/components/platform/SidebarNavItem.tsx`, `src/components/platform/Sidebar.module.css`, `tests/unit/platform/sidebar-navigation.test.tsx`, refreshed `docs/superpowers/evidence/p7b-sidebar-*.png`, P7B scorecard, 8 focused tests/typecheck/build | hold |
| 2026-07-24 | Close P6 Admin selected-company scope: `/api/dashboard` accepts `companyId` only for companyless Admin Master sessions, rejects RH/company override attempts, and `/dashboard` renders protected aggregates after explicit company selection with desktop/mobile evidence. | `src/app/api/dashboard/route.ts`, `src/hooks/useDashboard.ts`, `src/app/(platform)/dashboard/page.tsx`, `src/app/(platform)/dashboard/dashboard.module.css`, P6 evidence under `docs/superpowers/evidence`, 41 focused tests/typecheck/build | hold |
| 2026-07-24 | Complete P8 module-management preflight/governance: confirmed `company_modules` contract, read-only company-scoped API and no row creation on reads; future mutations remain HOLD until explicit approval and must include audit log, tenant isolation and no sensitive workflow activation. | `docs/superpowers/plans/2026-07-24-uniher-paola-p8-module-management-governance.md`, `docs/superpowers/audits/2026-07-24-uniher-paola-p8-module-management-preflight-scorecard.md`, current-state scorecard | hold |
| 2026-07-25 | Close post-push visual smoke follow-up: found and fixed dashboard mobile scroll clipping plus cramped age legend, reran dev and production-local visual smoke across Admin/RH/colaboradora routes, and documented env/deploy gates. | `src/app/globals.css`, `src/app/(platform)/dashboard/dashboard.module.css`, `docs/superpowers/audits/2026-07-25-uniher-paola-post-push-visual-smoke-scorecard.md`, external smoke reports under `C:\Users\user\Codex\2026-07-25` | hold |

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
- Wave 7 passed local validation and browser evidence; scorecard count was refreshed to 53 tests; explicit staging allowlist is still required before commit/promotion.
- Wave 8 passed revocation correction and local validation; explicit staging allowlist is still required before commit/promotion, and mobile bottom visual evidence should be recaptured if final visual approval depends on it.
- Wave 5 scheduled retention cleanup remains a future job spec, not an active background deletion process.
- P5 Check-out foundation now exists; P6 RH/Admin aggregate projection exists locally with RH screenshots and Admin Master selected-company API/UI proof. Full visual/product approval remains HOLD.
- NR-1/Yavix production work remains outside this orchestration unless explicitly assigned to R2/R7 lanes; the `/nr1` locked shell is allowed only as a no-runtime contract gate, `/colaboradora` can only expose `/avaliacao-nr1` when company modules mark NR-1 as visible/enabled, and the direct COPSOQ page/API now fail closed on the same runtime entitlement.
- Visual wave staging must be allowlisted manually because orchestration/research docs are also untracked in the same worktree.
- SIPAT content claimed by stakeholder is not validated in this local tree; P3 must use sourced assets/content or an honest locked/source-needed shell.
- Module-management mutations remain unimplemented; P4A is read-only runtime consumption of default navigation rows overlaid by existing `company_modules` rows.
- P8 module-management preflight is documented as PASS, but actual module mutations remain HOLD until explicitly approved.
- Post-push visual smoke passed after the mobile scroll fix. Production deploy still requires real `JWT_SECRET`/`JWT_REFRESH_SECRET`, and seeded RH smoke currently lands in `/onboarding-rh` until a completed-onboarding fixture is used.
- Dra. Paola's richer card/numbered visual treatment is implemented locally for the Sidebar with widened desktop shell and presentation-only emphasis bullets; final visual approval remains HOLD until operator/product review of the P7B screenshots.
- P5 Check-out foundation is implemented locally; Check-in x Check-out dashboard foundation exists as protected aggregate counts/series, but full visual/product approval remains HOLD.
- P7A has reproducible menu screenshots plus RH completed-onboarding dashboard proof; raw `metrics.json` is pre-polish and the post-polish label source is `rh-dashboard-complete-metrics.json`; full visual approval still depends on a design-target decision for whether to implement Dra. Paola's richer menu-card visual language.
- P7B visual-reference blocker is resolved by durable assets plus Design MD; focused Sidebar UI implementation is local PASS after fidelity and content-hierarchy correction, with any further polish limited to visual/sidebar scope unless a new lane opens.
- Post-audit correction execution has closed all six planned findings: Wave 8, Paola NR-1 default gate, P7A evidence refresh, Wave 7 scorecard count, Paola doc-tree next gates and visual-contained reconciliation.
