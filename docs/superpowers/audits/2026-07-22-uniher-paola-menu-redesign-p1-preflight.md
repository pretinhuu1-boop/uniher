# UniHER Paola menu redesign P1 preflight scorecard

**Date:** 2026-07-22
**Lane:** `P1 Module entitlement preflight`
**Decision:** PASS for docs/inventory; implementation remains HOLD

## Harness contract

Intent source: Dra. Paola's 2026-07-22 menu request, P0.1 repo contract, P0 scorecard, orchestration plan and current local repo inventory.

Coordinator: current session.

Worker lane: `P1 Module entitlement preflight`.

Write allowlist:

- `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1-preflight.md`
- `docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

Write denylist:

- `src/**`
- `data/**`
- `.next/**`
- production/deploy files
- public landing, metadata and email surfaces
- Yavix provisioning behavior
- Semaforo production behavior
- Liga/ranking production behavior
- Concierge case workflow
- Denuncias partner workflow

Allowed commands:

- `git status --short --branch`
- `git rev-parse --short HEAD`
- `git rev-parse --short origin/main`
- targeted `rg` / file reads
- `git diff --check` on docs write set

Stop condition: produce an implementation-ready module entitlement preflight with exact next migration and validators, without code changes.

## Preflight evidence

| Check | Result |
|---|---|
| Branch | `codex/uniher-wave3-collaborator-nr1` |
| Local HEAD | `f53db52` |
| `origin/main` | `f918885` |
| Dirty before P1 implementation | `src/app/(platform)/company-profile/page.tsx`, `src/services/objectives.service.ts`, untracked `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md` |
| Existing migration ceiling | `059_private_achievements.sql`; duplicate `047_*` names already exist |
| Recommended next migration name | `060_company_modules.sql` |

Implementation remains blocked because the worktree is dirty/divergent and no product-code allowlist has been opened.

## Schema inventory

Current schema primitives:

- `companies`: base tenant table with plan, branding, active/deleted fields added by later migrations.
- `users`: four-role model, company/department ownership, active/block/approval/master-admin/collaborator-capability fields.
- `company_settings`: generic per-company key/value table, currently used for `feed_company_enabled`.
- `system_settings`: global admin settings.
- No dedicated `company_modules` table or typed product-module contract exists.

Decision for next implementation:

- Use a dedicated company-scoped `company_modules` table instead of overloading `company_settings`.
- Keep role visibility in the typed module registry/navigation layer, not as duplicated rows per role.
- Company row controls module state; role registry controls who can see/use each module.

Recommended table shape for P1 implementation:

```sql
CREATE TABLE IF NOT EXISTS company_modules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_slug TEXT NOT NULL CHECK(module_slug IN (
    'primary_health',
    'concierge',
    'education',
    'achievements',
    'nr1',
    'sipat',
    'human_development',
    'denunciation'
  )),
  module_state TEXT NOT NULL CHECK(module_state IN (
    'enabled',
    'locked',
    'coming_soon',
    'partner_managed',
    'requires_contract'
  )),
  visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(company_id, module_slug)
);

CREATE INDEX IF NOT EXISTS idx_company_modules_company
  ON company_modules(company_id, visible, module_state);
```

Default interpretation:

- Absent row does not grant access.
- Base modules can be represented by code defaults only when they are not purchased modules.
- Premium/sensitive modules remain visible + locked by default when Dra. Paola requested visible menus.
- `enabled` means UI access only to already-approved behavior; it does not override clinical/legal/Yavix/product gates.

## Route and surface inventory

Existing surfaces to reuse:

- RH dashboard: `/dashboard`.
- Admin current operations panel: `/admin`.
- Company/admin primitives: `/admin`, `/company-profile`, `/colaboradoras-gestao`, `/convites`, `/departamentos`.
- Education/community: `/campanhas`, `/comunidade`, `/comunidade/gerenciar`, daily lesson APIs.
- Collaborator agenda/exams: `/agenda`, `/api/collaborator/agenda`, `/api/collaborator/exams`.
- Gamification/private progression: `/objetivos`, `/desafios`, `/conquistas`.
- Contained blocked surfaces: `/semaforo`, `/liga`.
- NR-1 preview/control surface: `/avaliacao-nr1` plus Yavix/COPSOQ preview API files.
- Admin/RH communications: `/analytics-emails`.

Surfaces not found as dedicated routes:

- Concierge.
- Viva SIPAT.
- Desenvolvimento Humano.
- Canal de Denuncias.
- Produtos e Modulos.
- Dedicated Admin Master `Empresas`, `Dashboard de Exames`, `Relatorios` and `Configuracoes` routes beyond the current monolithic/admin settings primitives.

Second-pass content reconciliation:

- Code search found `src/lib/participation/eligibility.ts` already names `denunciation` as a participation-exclusion domain.
- Code search found no dedicated SIPAT, Concierge, Denuncias or Desenvolvimento Humano route/content implementation.
- Because Dra. Paola explicitly said collaborator NR-1 and Viva SIPAT content are already available, P3 must not create new SIPAT content until P1A checks whether assets live outside `src/app` or in non-route content stores.

Reusable containment components:

- `src/components/platform/ContainedSurfacePreview.tsx`
- `src/components/ui/FeedbackState.tsx`

## Navigation inventory

`src/components/platform/navigation.ts` currently:

- hardcodes navigation by `UserRole`;
- supports roles `admin`, `rh`, `lideranca`, `colaboradora`;
- has no module state, lock badge metadata, entitlement input or role+module resolver;
- has no icons for Concierge, SIPAT, NR-1 module shell, Denuncias, Produtos e Modulos or Desenvolvimento Humano yet.

P2 should add typed module-aware navigation only after P1 implementation passes.

## Recommended P1 implementation allowlist

Do not open this automatically. When approved, keep the first code wave to:

- `src/lib/db/migrations/060_company_modules.sql`
- `src/types/modules.ts`
- `src/lib/modules/company-modules.ts`
- `tests/unit/company-modules.test.ts`
- `tests/unit/company-modules-migration.test.ts`

Optional only if local patterns require it:

- `src/lib/db/seed.ts`
- `src/lib/db/migrations/runner.ts`

Explicitly not in P1:

- `src/components/platform/navigation.ts`
- route pages
- dashboard charts
- check-out data model
- Concierge/Denuncias/SIPAT/Human Development workflows
- Yavix, Semaforo, Liga or ranking behavior

## Validators for approved P1 implementation

Minimum:

```powershell
git diff --check
npm run test:unit -- tests/unit/company-modules.test.ts tests/unit/company-modules-migration.test.ts
npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-api-containment.test.ts
npx tsc --noEmit
```

Recommended before promoting P1:

```powershell
npm run build
```

P1 has no screenshot gate because it must not change user-facing routes.

## Loop result

Preflight: confirmed branch, local HEAD, `origin/main`, dirty files and docs-only write policy.

Observe: inventoried migrations, base schema, `company_settings`, route surfaces, navigation, containment components and existing tests.

Plan: define a dedicated company-scoped module entitlement model and hold route/navigation changes for P2.

Act: wrote this preflight scorecard only.

Verify: run `git diff --check` on the docs write set before closing.

Reflect: P1 implementation can be small, but it must not be mixed with navigation/visual changes. The migration number should be `060` because `056` is already used and the current ceiling is `059`.

Coordinator gate: P1 implementation remains HOLD until the coordinator explicitly opens the implementation allowlist.

## Decision

PASS for docs/inventory. Product code remains HOLD.

Second-pass update: P1A content availability reconciliation is required before P3 shells.

## Verification

| Check | Result |
|---|---|
| `git diff --check -- docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p0-scorecard.md docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1-preflight.md docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md` | PASS; only LF/CRLF normalization warning on `SESSION_ORCHESTRATION_LEDGER.md`. |
| `git status --short --branch` | Confirms product code remains untouched by P1 preflight; pre-existing dirty files are still `company-profile`, `objectives.service` and untracked Yavix research. |
