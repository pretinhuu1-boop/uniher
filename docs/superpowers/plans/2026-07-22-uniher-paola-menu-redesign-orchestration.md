# UniHER Paola menu redesign orchestration

**Date:** 2026-07-22
**Status:** orchestration started, code implementation gated
**Source spec:** `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
**Scorecard:** `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p0-scorecard.md`
**Latest current-state scorecard:** `docs/superpowers/audits/2026-07-23-uniher-paola-redesign-current-state-scorecard.md`
**Mode:** global harness + loop canon

## 1. Objective

Execute Dra. Paola's menu redesign without recreating existing surfaces, weakening privacy gates or activating sensitive modules before approval.

This orchestration starts after P0.1 corrected the contract to full stakeholder coverage. It opens planning/inventory work now and keeps code changes blocked until the coordinator names an exact write allowlist.

## 2. Current preflight

Current dirty worktree observed before orchestration:

- Modified: `src/app/(platform)/company-profile/page.tsx`
- Modified: `src/services/objectives.service.ts`
- Modified by this orchestration: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Untracked pre-existing: `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`
- Untracked P0 docs:
  - `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
  - `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p0-scorecard.md`

Rule: preserve pre-existing changes. Do not stage, commit, reset, stash, checkout or deploy automatically.

## 3. Canonical context pack

Every lane reads:

- `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p0-scorecard.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- `docs/superpowers/research/2026-07-22-uniher-harness-loop-engineering-research.md`
- `src/components/platform/navigation.ts`
- target route files for the lane

When the lane touches sensitive module behavior, also read:

- `docs/INTEGRACAO_YAVIX_NR1.md`
- `docs/APIS_CRITICAS.md`
- relevant privacy tests under `tests/unit/privacy/`

## 4. Lane order

### P1 - Module entitlement preflight and implementation

**Status:** PASS
**Objective:** design and implement the smallest module entitlement harness before navigation changes.
**Evidence:** `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1-preflight.md`, `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1-implementation-scorecard.md`
**Allowlist used:** docs only:

- this orchestration plan
- P1 preflight scorecard under `docs/superpowers/audits/`

**Implementation allowlist used:**

- `src/lib/db/migrations/060_company_modules.sql`
- `src/types/modules.ts`
- `src/lib/modules/company-modules.ts`
- `tests/unit/company-modules.test.ts`
- `tests/unit/company-modules-migration.test.ts`

**Stop condition:** closed as PASS. No route or navigation behavior changed.

### P1A - Existing content reconciliation

**Status:** PASS for docs/inventory; SIPAT source unverified, code blocked
**Objective:** reconcile Dra. Paola's claim that NR-1 and Viva SIPAT content are already available before creating or linking shells.
**Evidence:** `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1a-content-inventory.md`
**Finding:** `/avaliacao-nr1` exists as NR-1 preview/control surface; targeted inventory found no dedicated SIPAT route/content and no Concierge, Denuncias or Desenvolvimento Humano route.
**Gate:** P3 must not invent SIPAT lessons, campaigns, videos, schedules or materials. P3 must either cite approved source assets/content or create only a locked/source-needed shell.

### P2 - Navigation contract

**Status:** PASS
**Objective:** generate role menus from role + module state while preserving the four-role model.
**Evidence:** `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p2-navigation-scorecard.md`
**Key checks:** role navigation tests, mobile sidebar badge rendering, visible lock badges, no sensitive behavior activation.

### P3 - Locked module shells

**Status:** PASS; SIPAT content remains source-gated
**Objective:** create visible locked shells for Concierge, SIPAT, Desenvolvimento Humano, Canal de Denuncias and Produtos e Modulos.
**Evidence:** `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p3-shells-scorecard.md`
**Rule:** locked/contained copy only; no case workflow, partner integration, clinical behavior or report handling.

### P4 - Existing surface regrouping

**Status:** PASS after finding correction
**Objective:** regroup existing Dashboard, Educacao, Agenda and Conquistas surfaces without duplicating modules.
**Evidence:** `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4-regrouping-scorecard.md`
**Rule:** reuse existing routes first.

### P4A - Sidebar data/API wiring

**Status:** PASS after finding correction
**Objective:** let the current Sidebar consume `company_modules` through a read-only authenticated endpoint.
**Evidence:** `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4a-sidebar-data-wiring-scorecard.md`
**Rule:** no module mutations, no default row creation during reads, no sensitive module behavior activation.

### P5 - Check-out foundation

**Status:** next safe implementation candidate
**Objective:** add check-out as a first-class daily wellbeing event before any check-in x check-out chart.
**Rule:** no XP, ranking, Liga, Semaforo or health scoring feed.

### P6 - Admin/RH aggregate dashboards

**Status:** waiting on P5 and privacy projection design
**Objective:** add dashboard indicators from Dra. Paola's list only when data exists and privacy permits.
**Rule:** aggregate suppression required.

### P7 - Production proof

**Status:** blocked on credentials
**Objective:** validate production menus for Admin, RH and collaborator.
**Blocker:** valid production RH and collaborator test accounts are required.

### P7A - Menu boxes visual QA

**Status:** HOLD for visual approval; runtime evidence captured
**Objective:** validate the current menu/sidebar treatment against Dra. Paola's three supplied visual references and the operator's current-runtime screenshot.
**Rule:** do not treat grouped functional navigation or one operator screenshot as visual approval without reproducible desktop/mobile screenshots.
**Evidence:** `docs/superpowers/audits/2026-07-23-uniher-paola-p7a-menu-boxes-visual-qa-scorecard.md`

## 5. P1 preflight checklist

Before opening code:

- [x] Confirm current `origin/main` and local HEAD.
- [x] Confirm dirty files are unrelated or explicitly included.
- [x] Inventory existing schema for companies, users, settings and module-like fields.
- [x] Inventory current routes for NR-1/SIPAT content that Dra. Paola says already exists.
- [x] Define exact module state enum.
- [x] Define whether the module model is company-scoped only or company + role scoped.
- [x] Name the migration number after checking existing migrations.
- [x] Write P1 scorecard with allowlist and validators.

P1 preflight conclusion: use dedicated company-scoped `company_modules`, role visibility in typed code registry and next migration `060_company_modules.sql`. Dedicated SIPAT content was not found in current route inventory; NR-1 preview exists at `/avaliacao-nr1` but remains contract-gated.

## 6. Validators for first implementation wave

Minimum once code opens:

```powershell
git diff --check
npm run test:unit -- <focused module/navigation/privacy tests>
npx tsc --noEmit
npm run build
```

Visual lanes also require authenticated desktop/mobile screenshots and mobile fixed-nav checks.

## 7. Current decision

Orchestration is started. P0.1, P1 preflight, P1 implementation, P1A content inventory, P2 navigation contract, P3 locked/source-needed shells, P4A Sidebar data/API wiring and P4 existing surface regrouping are PASS after the findings correction. P2 added module-aware navigation and badge metadata. P3 added safe static destinations for the locked modules. P4A connected the Sidebar to a read-only `/api/company/modules` endpoint that now returns default visible navigation rows overlaid by explicit `company_modules` rows without creating rows on read. P4 regrouped existing base routes into Dra. Paola's Dashboard, Educacao, Agenda/Meu bem-estar and Conquistas taxonomy and exposes the Admin Master taxonomy through existing/shell destinations. SIPAT remains source-gated.

The 2026-07-23 current-state audit changes the overall redesign decision to HOLD for full approval: the foundations above are technically closed, but the product is still partial against Dra. Paola's request. Remaining gaps are Check-out, Check-in x Check-out charts, RH/Admin aggregate indicators, menu/box visual proof, module-management mutations and all source/contract/partner-gated modules.

Next safe wave is P5 Check-out foundation, RH completed-onboarding fixture for final dashboard proof, or a design-target correction pass for P7A. P7A now has runtime screenshots but remains HOLD for full visual approval. P6 aggregate dashboards must wait for P5 data. Module-management mutations require a separate Admin/RH governance lane.
