# UniHER Paola menu redesign contract

**Date:** 2026-07-22
**Status:** executable spec, not implementation approval
**Scope:** authenticated internal UniHER platform menus for RH/company, collaborator and UniHER Admin Master
**Source request:** Dra. Paola's 2026-07-22 menu structure for RH, collaborator and platform administrator
**Canonical workspace:** `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
**Latest current-state scorecard:** `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`

## 1. Purpose

Dra. Paola requested a clearer UniHER menu structure across three product views:

- RH / company
- collaborator
- UniHER platform administrator

This contract converts that request into an implementation-ready route, module and governance map. It deliberately starts with a docs-only P0 lane because the current worktree is dirty and divergent from `origin/main`.

This file is the repo-side counterpart to the Obsidian note:

`C:\Users\user\Documents\Obsidian Vault\Mission\2026-07-22-uniher-paola-menu-redesign-spec.md`

## 2. Evidence baseline

Verified before this spec:

- Production health: `https://uniher.com.br/api/health` returned healthy on 2026-07-22, with DB ok, 6 users, 1 company and write queue pending 0.
- DNS: `uniher.com.br` resolved to `187.77.42.199`.
- Production Admin Master menu was inspected after successful admin login: `Visao geral`, `Gerenciar comunidade`, `Analytics global`, `Notificacoes`, `Configuracoes`.
- Production RH and collaborator menu inspection is blocked: repo-documented `rh@teste.com` and `colab@teste.com` returned 401 in production.
- Current role model in code remains four roles: `admin`, `rh`, `lideranca`, `colaboradora`.
- Current navigation source of truth: `src/components/platform/navigation.ts`.
- Current `origin/main` checked during discovery: `f918885`.
- Local worktree HEAD checked during discovery: `f53db52`.
- Local worktree was dirty before this docs lane:
  - `src/app/(platform)/company-profile/page.tsx`
  - `src/services/objectives.service.ts`
  - `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`

Treat production and `origin/main` as current deployment truth. Treat the local worktree as useful implementation/planning evidence, not automatically production-equivalent.

## 3. Harness contract

**Intent source:** Dra. Paola 2026-07-22 menu request, Obsidian Paola spec, current production/Admin inspection, `origin/main`, local redesign docs and existing privacy gates.
**Coordinator:** one integration owner. Workers do not self-promote.
**Worker lane:** one bounded lane at a time.
**Write allowlist:** exact files/directories named per lane.
**Write denylist:** public landing, metadata, email surfaces, Yavix provisioning, Semaforo production behavior, Liga production behavior, clinical/legal surfaces, unrelated docs, `data/`, `.next/`, screenshots and generated reports unless explicitly assigned.
**Runtime preflight:** `git status --short --branch`, branch, HEAD, `origin/main`, dirty files, environment flags, local dev host, production host and valid auth fixtures.
**Context pack:** this spec, Obsidian Paola spec, `src/components/platform/navigation.ts`, target route files, `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`, harness/loop research, current scorecards and relevant privacy/Yavix docs.
**Allowed commands:** targeted `rg`, targeted file reads, `git diff --check`, focused unit/privacy tests, `npx tsc --noEmit`, `npm run build`, Playwright/browser screenshots for visual lanes.
**Evidence outputs:** lane receipt, changed-file list, commands and results, desktop/mobile screenshots when visual, production/auth blockers, scorecard path.
**Verification gates:** role navigation, module lock visibility, no sensitive data leaks, no horizontal overflow, no fixed-nav occlusion, typecheck/build/tests.
**Governance gates:** product, clinical, DPO/juridico, SST, partner, tenant/privacy and Yavix contract gates where applicable.
**Stop conditions:** `PASS`, `FAIL`, `BLOCKED`, `ESCALATE`, `HOLD`.

Minimum harness coverage uses ETCLOVG:

- Execution: checkout, branch, route/lane and runtime.
- Tooling: permitted shell, npm, Playwright, MCP and browser actions.
- Context: ordered source pack and stale-doc handling.
- Lifecycle: lane state and stop condition.
- Observability: receipts, diffs, logs, screenshots and failure taxonomy.
- Verification: deterministic checks plus visual/mobile evidence when user-facing.
- Governance: named owners/gates for clinical, legal, DPO, SST, product, partner and Yavix decisions.

## 4. Loop contract

Each lane runs the same loop:

1. Preflight
   - Confirm branch, HEAD, `origin/main`, dirty files and assigned write set.
   - Refuse unrelated writes and preserve user-owned work.
2. Observe
   - Read this spec, the Obsidian spec, current navigation, target route files and relevant scorecards.
   - Inspect production where credentials allow. Mark auth blockers explicitly.
3. Plan
   - Define the smallest route/module/menu change.
   - Name validators and screenshot states before editing.
4. Act
   - Edit only allowlisted files.
   - Reuse existing surfaces before creating new modules.
5. Verify
   - Run focused deterministic checks.
   - Capture desktop/mobile screenshots for user-facing changes.
   - Check privacy, role and containment constraints.
6. Reflect
   - Write a receipt with files read, files changed, commands, evidence, residual risks and decision.
7. Coordinator gate
   - Coordinator reviews diff/evidence independently and updates ledger/scorecard.
   - No stage, commit, PR, push, deploy or production claim without explicit approval.

## 5. Product role model

Dra. Paola's request names three product menus, but implementation must preserve the existing four-role model:

| Product view | Code role(s) | Rule |
|---|---|---|
| UniHER Admin Master | `admin` | Platform-wide operations and module administration. |
| RH / company | `rh` | Company-level management and aggregate-only dashboards. |
| Leadership | `lideranca` | Keep as restricted RH-like projection unless product requests a separate menu. |
| Collaborator | `colaboradora` | Self-only journey, private agenda and locked/entitled modules. |

Do not collapse `lideranca` into `rh` in code. It may share menu groups only through explicit role policy.

## 6. Existing surfaces to reuse

Do not recreate these as new modules:

| Paola concept | Existing route/source | Status |
|---|---|---|
| RH Dashboard | `/dashboard` | Exists, privacy-protected, neutral/limited metrics. |
| Admin dashboard geral | `/admin` | Exists as Master operations panel; may need recomposition. |
| Empresas | `/admin`, company APIs, `/company-profile` | Partial; needs clearer Admin Master route split. |
| Colaboradoras/users | `/colaboradoras-gestao`, `/convites`, `/departamentos` | Exists for RH. |
| Minha agenda de exames | `/agenda` | Exists for collaborator. |
| Educacao/campanhas | `/campanhas`, `/comunidade`, `/comunidade/gerenciar`, daily lesson | Exists but fragmented. |
| Objetivos | `/objetivos` | Exists for private collaborator objectives. |
| Desafios | `/desafios`, `/desafios/gerenciar` | Collaborator v2 exists; management route remains separate/review. |
| Conquistas | `/conquistas` | Exists for private deterministic achievements. |
| Liga | `/liga` | Exists only as contained/blocked surface. |
| Semaforo da Saude | `/semaforo`, `/api/collaborator/semaforo*` | Exists only as contained/blocked surface. |
| NR-1 preview | `/avaliacao-nr1`, COPSOQ mock/client pieces, `src/lib/nr1/preview-state.ts` | Controlled preview/demo, not verified Yavix production contract. |
| Analytics/comunicacao | `/analytics-emails` | Exists for admin/RH communication metrics. |
| Configuracoes/notificacoes | `/configuracoes`, `/notificacoes` | Exists as personal/system support. |

## 7. Missing or partial surfaces

These are not complete product modules today:

- Generic `Produtos e Modulos` entitlement layer for per-company module activation/deactivation.
- `Concierge` case management and indicators.
- `Viva SIPAT` module shell, campaign calendar, materials, videos and actions.
- `Desenvolvimento Humano` module shell and future content management.
- `Canal de Denuncias` module shell and partner-administered integration boundary.
- True `Check-out` flow.
- RH/Admin comparative chart `Check-in x Check-out`.
- Admin Master dedicated routes for `Empresas`, `Produtos e Modulos`, `Relatorios` and possibly `Dashboard Geral`.
- Module-aware navigation labels, lock badges and enabled/locked states.

## 8. Module entitlement model

The first implementation wave after this docs contract should introduce a generic company module model. Initial slugs:

| Slug | Label | Default visibility | Default access | Governance |
|---|---|---|---|---|
| `primary_health` | Saude Primaria | visible | locked/contained until approval | clinical + DPO + SST |
| `concierge` | Concierge | visible under Saude Primaria/Admin | locked | product + clinical + DPO |
| `education` | Educacao | visible | enabled using existing campaign/content surfaces | product |
| `achievements` | Conquistas | visible | enabled for existing safe routes; Liga locked | product + privacy |
| `nr1` | NR-1 | visible | locked/preview only | Yavix contract + legal + DPO + SST |
| `sipat` | Viva SIPAT | visible | locked shell | product + contract |
| `human_development` | Desenvolvimento Humano | visible | locked shell | product |
| `denunciation` | Canal de Denuncias | visible | locked/partner managed | legal + partner + DPO |

P1 implementation states:

- `enabled`
- `locked`
- `coming_soon`
- `partner_managed`
- `requires_contract`

Visibility in the menu is not the same as permission to execute module behavior. Locked modules can be visible with honest copy.

## 9. Target menu contract

This section is intentionally explicit against Dra. Paola's list. If a line below says "blocked", the menu item remains visible as requested, but the behavior must wait for the named gate.

### 9.1 RH / company

1. Dashboard
   - Route: keep `/dashboard`.
   - Cover: company overview, all approved indicators and charts, adherence, evolution, absenteeism, presenteeism and other platform metrics.
   - Add check-in x check-out comparative chart only after check-out exists.
   - Keep aggregate suppression and privacy-safe projection for every indicator.
2. Saude Primaria
   - New group or route shell.
   - No individual Semaforo access.
   - Cover: Semaforo da Saude green/yellow/red classifications, quantity of collaborators per classification and company health evolution.
   - Concierge is a locked submodule unless purchased/enabled.
   - Concierge must later cover accompanied case management only for companies that purchased the module.
3. Educacao
   - Reuse `/campanhas` and `/comunidade/gerenciar`.
   - Group campaigns, trails, video classes, educational content and support materials.
4. Conquistas
   - Group individual objectives, team objectives, Liga, general ranking, team ranking, achievements and medals.
   - Rewards are part of the product vocabulary but stay governed by the same privacy/product gate as rankings and Liga.
   - Keep Liga contained/locked by default.
5. NR-1
   - Visible locked item.
   - Cover the management area for psychosocial risks and materials related to NR-1.
   - No uncontracted Yavix production behavior.
6. Viva SIPAT
   - Visible locked module shell.
   - Cover campaigns, schedules, materials, videos and SIPAT actions after contract/entitlement.
7. Desenvolvimento Humano
   - Visible locked module shell.
   - Content is future-fillable and blocked by default until the company purchases the module.
8. Canal de Denuncias
   - Visible locked/partner-managed shell.
   - Future flow must cover receiving, tracking and managing reports through the partner responsible for NR-1.

### 9.2 Collaborator

1. Saude Primaria
   - Reuse `/semaforo`.
   - Cover individual green/yellow/red classification, guidance and actions according to the classification.
   - Keep contained until clinical/privacy approval.
2. Meu Bem-Estar
   - Current check-in exists on `/colaboradora`.
   - Add check-out as a first-class event before charts.
   - Check-in copy must answer "Como voce chega hoje?" and record emotional/wellbeing state at the beginning of the day.
   - Check-out copy must answer "Como voce encerra o seu dia?" and record emotional/wellbeing state at the end of the day.
   - Do not feed XP, ranking, Liga, Semaforo or health scoring.
3. Minha Agenda de Exames
   - Reuse `/agenda`.
   - Cover appointments/exams, reminders, history and follow-up.
4. Educacao
   - Reuse `/campanhas`, `/comunidade` and DailyLesson.
   - Cover video classes, learning trails, monthly campaigns and educational content.
5. Conquistas
   - Reuse `/objetivos`, `/desafios`, `/conquistas`.
   - Group all existing safe gamification functions here: challenges, rewards, Liga, ranking, medals and achievements.
   - Keep `/liga` locked unless policy gate passes.
6. NR-1
   - Visible locked item.
   - Stakeholder states content is already available; implementation must inventory actual repo/runtime content before rebuilding it.
   - Link to controlled preview only when entitlement/preview gates allow.
7. Viva SIPAT
   - Visible locked module shell.
   - Stakeholder states content is already available; implementation must inventory actual repo/runtime content before rebuilding it.
8. Desenvolvimento Humano
   - Visible locked module shell.
   - Content is blocked by default and future-updatable after module purchase.

### 9.3 UniHER Admin Master

1. Dashboard Geral
   - Recompose `/admin` into executive overview or create `/admin/dashboard`.
   - Cover active companies, total registered collaborators, platform adherence, check-in/check-out, consolidated Semaforo, exams completed/pending, general platform indicators and evolution of main indicators.
2. Empresas
   - Separate company list, environment access, users, permissions and module activation from the monolithic admin page.
   - Cover company settings and activation/deactivation of contracted modules.
3. Saude Primaria
   - Aggregate-only, across companies, after privacy/clinical gate.
   - Cover consolidated Semaforo, indicators by company, department and period, and collaborator evolution monitoring.
4. Concierge
   - New cross-company case management area, locked until module exists.
   - Later coverage: all accompanied cases, collaborators under follow-up, service status, pending items, response time and Concierge performance indicators.
5. Dashboard de Exames
   - Reuse existing exam aggregate foundations; create clearer admin route if needed.
   - Cover exams in good standing, pending exams, expired exams, company evolution and prevention indicators.
6. Educacao
   - Reuse content/campaign management and add trails/video/material taxonomy.
   - Cover campaign management, content creation/editing, video classes, trails and monthly campaign scheduling.
7. Gamificacao
   - Manage challenges/rewards/rankings only within approved privacy contract.
   - Cover challenge management, leagues, rewards, rankings and engagement campaigns.
   - Legacy gamification remains quarantined.
8. Produtos e Modulos
   - New core entitlement/admin layer.
   - Must include NR-1, Viva SIPAT, Desenvolvimento Humano, Canal de Denuncias, Concierge and activation/deactivation of features.
9. Relatorios
   - Reuse `/historico`/dashboard export patterns but separate Admin Master reporting.
   - Cover reports by company, consolidated reports, data export, impact indicators and ROI.
10. Configuracoes
   - Reuse existing admin/settings/user permission primitives.
   - Cover UniHER administrator management, access permissions and general platform settings.

## 9A. Specification capture audit

This table tracks whether Dra. Paola's requested menu concepts are captured in the executable contract. It is not an implementation-complete claim. Runtime completion remains governed by the lane status in section 13.

| Stakeholder section | Coverage after correction | Notes |
|---|---|---|
| RH Dashboard | SPEC CAPTURED / PARTIAL RUNTIME | Existing dashboard reused; first protected Check-in x Check-out aggregate foundation exists; broader indicators and visual approval remain gated. |
| RH Saude Primaria | SPEC CAPTURED / LOCKED RUNTIME | Semaforo colors/counts/evolution and Concierge captured; runtime waits clinical/privacy/product gates. |
| RH Educacao | SPEC CAPTURED / EXISTING RUNTIME | Campaigns, trails, video classes, educational content and materials map to existing education surfaces. |
| RH Conquistas | SPEC CAPTURED / GATED RUNTIME | Objectives, Liga, rankings, achievements, medals and rewards vocabulary captured; rankings/Liga remain gated. |
| RH NR-1 | SPEC CAPTURED / LOCKED RUNTIME | Visible locked menu and psychosocial/materials management area captured; Yavix behavior remains contract-blocked. |
| RH Viva SIPAT | SPEC CAPTURED / SOURCE-GATED RUNTIME | Visible locked menu plus campaigns, schedules, materials, videos and actions captured; content source not verified. |
| RH Desenvolvimento Humano | SPEC CAPTURED / LOCKED RUNTIME | Visible locked and future-fillable. |
| RH Canal de Denuncias | SPEC CAPTURED / PARTNER-GATED RUNTIME | Visible partner-managed report flow captured; no receiving/tracking workflow active. |
| Collaborator Saude Primaria | SPEC CAPTURED / LOCKED RUNTIME | Individual classification/guidance captured; clinical/privacy gate remains. |
| Collaborator Meu Bem-Estar | SPEC CAPTURED / P5 FOUNDATION IMPLEMENTED | Check-in and Check-out prompts exist with controlled private wellbeing events; RH/Admin chart waits for P6 aggregate projection. |
| Collaborator Agenda | SPEC CAPTURED / EXISTING RUNTIME | Existing route covers agenda/reminders/history/follow-up target. |
| Collaborator Educacao | SPEC CAPTURED / EXISTING RUNTIME | Video classes, trails, monthly campaigns and educational content map to existing surfaces. |
| Collaborator Conquistas | SPEC CAPTURED / GATED RUNTIME | Challenges, rewards, Liga, ranking, medals and achievements grouped; Liga/ranking remain gated. |
| Collaborator NR-1 | SPEC CAPTURED / LOCKED RUNTIME | Visible module and stakeholder's "content already available" claim captured as inventory requirement. |
| Collaborator Viva SIPAT | SPEC CAPTURED / SOURCE-GATED RUNTIME | Stakeholder's "content already available" claim captured as inventory requirement. |
| Collaborator Desenvolvimento Humano | SPEC CAPTURED / LOCKED RUNTIME | Visible, blocked by default, future-updatable. |
| Admin Dashboard Geral | SPEC CAPTURED / PARTIAL RUNTIME | Existing `/admin` overview reused; first protected check-in/out aggregate foundation exists in dashboard projection; sensitive aggregates remain gated. |
| Admin Empresas | SPEC CAPTURED / EXISTING RUNTIME | Company list, environment access, settings and permissions remain in the Admin Master panel. |
| Admin Saude Primaria | SPEC CAPTURED / LOCKED RUNTIME | Consolidated Semaforo and indicators captured; runtime waits clinical/privacy gates. |
| Admin Concierge | SPEC CAPTURED / LOCKED RUNTIME | Cases, collaborators, statuses, pending items, response time and indicators captured; case workflow inactive. |
| Admin Dashboard de Exames | SPEC CAPTURED / PARTIAL RUNTIME | Existing reporting/history foundation reused; dedicated admin exam dashboard remains future lane. |
| Admin Educacao | SPEC CAPTURED / EXISTING RUNTIME | Campaign/content/video/trail/monthly scheduling management maps to existing community/campaign surfaces. |
| Admin Gamificacao | SPEC CAPTURED / GATED RUNTIME | Challenges, leagues, rewards, rankings and engagement campaigns captured; legacy gamification remains quarantined. |
| Admin Produtos e Modulos | SPEC CAPTURED / SHELL RUNTIME | Contracted module control captured; current route is a locked governance shell without mutations. |
| Admin Relatorios | SPEC CAPTURED / PARTIAL RUNTIME | Existing analytics/reporting routes reused; ROI/exports remain future lanes. |
| Admin Configuracoes | SPEC CAPTURED / EXISTING RUNTIME | Admins, permissions and general platform settings remain in the Admin Master panel. |

## 10. Non-negotiable gates

- UniHER remains source of truth for companies/employees.
- Do not infer Yavix provisioning endpoints or payloads from public discovery.
- NR-1/Yavix production behavior requires the current Yavix contract, including auth, provisioning, scoring/results endpoint, idempotency, reconciliation, retention, rate limits and error semantics.
- Semaforo production behavior remains blocked until clinical/product/DPO/SST decisions approve self-report copy, non-diagnostic labels, consent, retention, deletion, audience and downstream prohibitions.
- Liga/ranking behavior remains blocked until product/legal decisions approve opt-in, revocation, minimum cohort, suppression, scoring formula, DSAR behavior and accountable owner.
- RH/Admin must not see individual Semaforo, NR-1 answers, check-in mood, agenda/exam details or health-sensitive records unless a specific approved privacy contract exists.
- Gamification must not use legacy points, badges, levels, `health_scores`, NR-1 answers, agenda, exams, Semaforo or health data as participation inputs.
- Production menu proof for RH and collaborator remains blocked until valid production test users exist.

## 11. Lane split

| Lane | Objective | Initial write policy | Required gate |
|---|---|---|---|
| P0 Spec and route contract | Create this repo spec, route/module matrix and docs-only scorecard | docs only | Must not touch code. |
| P1 Module entitlement harness | Add module storage/model/helpers and tests | migration/service/navigation tests only | No clinical/legal behavior. |
| P2 Navigation contract | Generate role menus from role + module states | navigation/sidebar tests and route shell links | Preserve four-role model. |
| P3 Locked module shells | Add shells for Concierge, SIPAT, Desenvolvimento Humano, Denuncias, Produtos e Modulos | shell pages + shared locked components | Locked copy only. |
| P4A Sidebar data/API wiring | Let Sidebar consume company module rows | read-only API + Sidebar SWR/tests | No mutations or default row creation on read. |
| P4 Existing surface regrouping | Group existing Education, Conquistas, Agenda and Dashboard surfaces | route/page copy and nav labels | Reuse existing routes. |
| P5 Check-out foundation | Add check-out before check-in x check-out charts | wellbeing data/API/UI/tests | No XP/ranking/Liga/Semaforo/health scoring feed. |
| P6 Admin/RH aggregates | Add charts only when data exists and privacy permits | dashboard projections/services/tests | Aggregate suppression required. |
| P7 Production proof | Validate admin/RH/collaborator menus in production | receipts/screenshots only | Requires valid RH/collaborator production accounts. |

## 12. P0 receipt

**Status:** PASS if this file exists, `git diff --check` passes and no code files changed in the P0 lane.
**Objective:** freeze the menu/module contract before mutable implementation.
**Write set assigned:** this spec, the P0 scorecard and the coordinator ledger registration.
**Privacy/role checks:** gates stated; no runtime behavior changed.
**Promotion recommendation:** promote as planning artifact only; do not stage, commit, PR, deploy or start P1/P2 without explicit coordinator allowlist.

## 13. Next action

Current state after second-pass audit:

- P0 route/module contract is closed after P0.1 coverage correction.
- P1 module entitlement preflight is closed as docs/inventory only.
- P1 module entitlement implementation is closed: `company_modules`, typed module contract, helper and focused tests exist.
- P1A content inventory is closed as docs/inventory only: NR-1 exists as a controlled preview/scaffold; SIPAT source content is not verified in this tree.
- P2 navigation contract is closed: module-aware navigation and badge metadata exist.
- P3 locked/source-needed shells are closed: static contained pages exist for Saude Primaria, Concierge, Viva SIPAT, Desenvolvimento Humano, Canal de Denuncias and Produtos e Modulos.
- P4A Sidebar data/API wiring is closed after finding correction: `GET /api/company/modules` exists as an authenticated read-only endpoint and returns default visible navigation rows overlaid by explicit `company_modules` rows without creating rows on read.
- P4 existing surface regrouping is closed after finding correction: base navigation now reuses existing routes under Dashboard, Educacao, Meu bem-estar/Agenda and Conquistas taxonomy and exposes the Admin Master taxonomy through existing/shell destinations without duplicating modules.
- SIPAT remains source-gated for any content-bearing implementation.

Current state after 2026-07-23 MCP/Obsidian and repo audit:

- Overall redesign decision is HOLD for full approval, even though P1-P4 technical foundations are PASS.
- The visual menu/box treatment from Dra. Paola's three supplied images has P7A runtime evidence, but remains HOLD for full visual approval because the current sidebar is functional grouped navigation rather than the richer menu-card/numbered visual language from the references.
- `Meu Bem-Estar` P5 foundation exists: Check-in and Check-out record controlled private wellbeing events.
- RH/Admin dashboard coverage remains partial; P6 now has a first protected Check-in x Check-out aggregate foundation, but broader indicators and visual/product approval remain gated.
- Semaforo/Saude Primaria, Concierge, SIPAT, Desenvolvimento Humano, Canal de Denuncias, Liga/ranking and Yavix/NR-1 production behavior remain gated.
- Runtime proof was not refreshed in the 2026-07-23 audit because `localhost:3001/api/health` did not respond.

Next smallest executable choices:

1. Broaden P6 verification/browser evidence for the protected aggregate dashboard, or open P7B visual target correction if the next goal is visual alignment first.
2. Keep P5 private event data out of individual RH/Admin views.
3. Open a separate Admin/RH module-management lane with explicit mutation governance.
4. Source/approve SIPAT content policy before any SIPAT content-bearing implementation.

Do not rerun P0, and do not start navigation/shell code until the relevant gate is explicitly open.
