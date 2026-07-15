# UniHER Platform Wave 2 RH Route Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the remaining RH routes onto the approved UniHER platform language while preserving business behavior, health/analytics privacy boundaries, API contracts, keyboard access, and responsive operation.

**Architecture:** Keep `AppLayout`, `Sidebar`, `MobileTopbar`, platform tokens, and the Wave 1 primitives as the shared shell. Migrate one route lane at a time behind focused unit and Playwright contracts; keep data fetching and mutations in the existing route modules unless a tested view-model extraction materially simplifies rendering. Reuse `PageHeader`, `SummaryBand`, `FeedbackState`, and `Button` rather than introducing route-local substitutes. Validate each lane independently, then run the complete role suite before promotion.

**Tech Stack:** Next.js App Router, React 19, TypeScript, CSS Modules, Tailwind utilities already present in legacy routes, SWR, Vitest/Testing Library, Playwright, SQLite-backed test fixtures.

---

## Context and promotion boundary

Wave 1 passed at reviewed product commit `bd28548`: 75 unit tests, TypeScript, production build, and 78 Playwright tests were green. This plan begins only from that verified state. It plans RH route work; it does not authorize an Admin Master redesign, collaborator redesign, API redesign, public release, or changes to health-data visibility.

Health, analytics, engagement, and reporting surfaces must remain aggregate-only. Collaborator Management may show the individual account and organization data required for administration, such as name, email, role, status, and department. It must never expose individual health answers, diagnoses, exam results, health-risk classifications or scores, or health-derived drill-downs. Preserve existing HTTP methods, request bodies, response shapes, role checks, onboarding redirects, filters, exports, and mutation semantics unless a separate contract-backed change is approved.

## Green-branch execution contract

RED is a local observation, never a commit state. The shared harness may commit reusable helpers, green smoke/contracts, and explicit `test.fixme` placeholders for unopened lanes. For each route lane, remove only that lane's `test.fixme` (or add its focused test), run it locally to capture the expected RED, implement the route, run the focused tests plus the relevant RH gates to GREEN, and only then stage and commit. Every task and every commit in this plan must leave the branch green; never publish or hand off a commit with an activated failing test.

## Route inventory and target files

| Lane                    | Existing route files                                                                                                              | Primary contracts to preserve                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Dashboard follow-up     | `src/app/(platform)/dashboard/page.tsx`, `dashboard.module.css`, `dashboard-view-model.ts`, `dashboard-export.ts`, `components/*` | Aggregate KPIs, filters, export safety, onboarding redirect, empty/error/loading states  |
| Invitations             | `src/app/(platform)/convites/page.tsx`, `convites.module.css`, `loading.tsx`                                                      | Create/revoke/batch invites, approve/reject, department assignment, copy link            |
| Campaigns               | `src/app/(platform)/campanhas/page.tsx`, `campanhas.module.css`, `loading.tsx`, `error.tsx`                                       | Campaign listing, participation/status actions, dates, edit/delete permissions           |
| Departments             | `src/app/(platform)/departamentos/page.tsx`, `loading.tsx`                                                                        | List/create/edit/delete through `/api/rh/departments`                                    |
| Collaborator Management | `src/app/(platform)/colaboradoras-gestao/page.tsx`, `loading.tsx`                                                                 | Search/filter/page, department update, edit, password reset, soft delete                 |
| Reports                 | `src/app/(platform)/historico/page.tsx`, `historico.module.css`, `loading.tsx`                                                    | Period/department filters and aggregate `/api/analytics/history` results                 |
| RH Configuration        | `src/app/(platform)/company-profile/*`, `src/app/(platform)/gamificacao-config/*`                                                 | Company update/logo upload; gamification, reward, redemption, lesson CRUD and validation |

Shared files may be changed only when at least two migrated routes need the same behavior: `src/components/platform/PageHeader.tsx`, `SummaryBand.tsx`, `src/components/ui/Button.tsx`, `Input.tsx`, `FeedbackState.tsx`, and platform token styles. Prefer route CSS Modules over broad global changes.

## Task 1: Freeze RH route contracts and create the migration harness

**Files:**

- Create: `tests/e2e/rh-route-migration.spec.ts`
- Modify: `tests/playwright.config.ts`
- Create: `tests/unit/platform/rh-route-contracts.test.tsx`
- Reference only: `tests/e2e/rh.spec.ts`, `tests/e2e/platform-foundation.spec.ts`

- [ ] **Step 1: Create green shared route-shell and privacy helpers**

Create reusable authenticated RH helpers for one main landmark and one `h1`, active navigation, role context, 44px primary controls, visible focus, 375px root-width containment, loading/error/empty feedback, and role-appropriate privacy. Keep unopened route cases as named `test.fixme` blocks with the lane and activation condition. The helpers may assert aggregate-only health/analytics/engagement reporting while allowing necessary account and organization identity fields on Collaborator Management.

- [ ] **Step 2: Add mutation contract fixtures**

Capture the existing request method, URL, and essential body fields for invitation, department, collaborator, company, campaign, reward, redemption, and lesson mutations. Mock only network boundaries; do not replace route behavior with snapshot-only tests.

- [ ] **Step 3: Register a dedicated Playwright project**

Add `rh-route-migration` with the same production web server, database seeding, teardown discipline, and configured worker policy as the existing projects.

- [ ] **Step 4: Confirm the registered harness is GREEN**

Run:

```powershell
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --project=rh-route-migration --project=rh
cd ..
npm run test:unit
npx tsc --noEmit
```

Expected: authenticated setup, shared contracts, existing platform foundation, and RH regression tests pass. Unopened lane cases appear only as explicitly named `fixme` skips and do not make the branch red.

- [ ] **Step 5: Commit the green contract harness**

```powershell
git add tests/e2e/rh-route-migration.spec.ts tests/playwright.config.ts tests/unit/platform/rh-route-contracts.test.tsx
git commit -m "test: freeze Wave 2 RH route contracts"
```

## Task 2: Close the dashboard follow-up without regressing Wave 1

**Files:**

- Modify: `src/app/(platform)/dashboard/page.tsx`
- Modify: `src/app/(platform)/dashboard/dashboard.module.css`
- Modify as needed: `src/app/(platform)/dashboard/components/*.tsx`
- Modify: `tests/unit/platform/dashboard.test.tsx`
- Modify: `tests/e2e/rh-route-migration.spec.ts`

- [ ] **Step 1: Activate the Dashboard lane and capture RED locally**

Remove the Dashboard `test.fixme` and add focused cases for filter keyboard labels, 44px export/action controls, chart text alternatives, responsive details, error retry, and aggregate-only labels. Run the focused tests, record the expected failure, and do not stage or commit the RED state.

```powershell
npm run test:unit -- --run tests/unit/platform/dashboard.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "dashboard"
cd ..
```

- [ ] **Step 2: Apply the shared platform primitives surgically**

Keep the existing view model and CSV formula neutralization. Remove route-local visual duplication only where `PageHeader`, `SummaryBand`, `FeedbackState`, or current `Button` already supplies the required contract.

- [ ] **Step 3: Verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/dashboard.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "dashboard"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 4: Commit only after Step 3 is GREEN**

```powershell
git add 'src/app/(platform)/dashboard' tests/unit/platform/dashboard.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: finish RH dashboard migration"
```

## Task 3: Migrate Invitations

**Files:**

- Modify: `src/app/(platform)/convites/page.tsx`
- Modify: `src/app/(platform)/convites/convites.module.css`
- Modify: `src/app/(platform)/convites/loading.tsx`
- Create: `tests/unit/platform/invitations-route.test.tsx`
- Modify: `tests/e2e/rh-route-migration.spec.ts`

- [ ] **Step 1: Activate the Invitations lane and capture RED locally**

Remove the Invitations `test.fixme` and cover single and batch creation, duplicate/error feedback, department creation/selection, revoke, approve/reject, copy-link status, modal focus containment/restoration, and mobile stacking. Run the focused unit and Playwright cases to capture RED, then leave the failure unstaged and uncommitted.

```powershell
npm run test:unit -- --run tests/unit/platform/invitations-route.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "invitations"
cd ..
```

- [ ] **Step 2: Migrate presentation while preserving APIs**

Keep `/api/invites`, `/api/invites/pending`, `/api/invites/batch`, `/api/invites/approve`, invite deletion, and existing department semantics unchanged. Replace ad hoc headers, buttons, fields, and feedback with shared primitives.

- [ ] **Step 3: Verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/invitations-route.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "invitations"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 4: Commit only after Step 3 is GREEN**

```powershell
git add 'src/app/(platform)/convites' tests/unit/platform/invitations-route.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: migrate RH invitations route"
```

## Task 4A: Migrate Campaigns

**Files:**

- Modify: `src/app/(platform)/campanhas/page.tsx`
- Modify: `src/app/(platform)/campanhas/campanhas.module.css`
- Modify: `src/app/(platform)/campanhas/loading.tsx`
- Modify: `src/app/(platform)/campanhas/error.tsx`
- Create: `tests/unit/platform/campaigns-route.test.tsx`
- Modify: `tests/e2e/rh-route-migration.spec.ts`

- [ ] **Step 1: Activate the Campaigns lane and capture RED locally**

Remove the Campaigns `test.fixme` and cover list states, date/progress/status meaning, mutations, error handling, and edit/delete authorization. Run the focused cases to capture RED; do not stage or commit that state.

```powershell
npm run test:unit -- --run tests/unit/platform/campaigns-route.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "campaigns"
cd ..
```

- [ ] **Step 2: Migrate Campaigns**

Use a single page header, semantic status text in addition to color, shared feedback states, and responsive actions. Retain `outline` compatibility until all consuming routes are migrated; do not remove a Button alias while `rg` finds a consumer.

- [ ] **Step 3: Verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/campaigns-route.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "campaigns"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 4: Commit only after Step 3 is GREEN**

```powershell
git add 'src/app/(platform)/campanhas' tests/unit/platform/campaigns-route.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: migrate RH campaigns route"
```

## Task 4B: Migrate Departments

**Files:**

- Modify: `src/app/(platform)/departamentos/page.tsx`
- Modify: `src/app/(platform)/departamentos/loading.tsx`
- Create: `tests/unit/platform/departments-route.test.tsx`
- Modify: `tests/e2e/rh-route-migration.spec.ts`

- [ ] **Step 1: Activate the Departments lane and capture RED locally**

Remove the Departments `test.fixme` and cover list/create/edit/cancel/delete behavior, error feedback, explicit destructive confirmation, focus restoration, and mobile containment. Run the focused cases to capture RED; do not stage or commit that state.

```powershell
npm run test:unit -- --run tests/unit/platform/departments-route.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "departments"
cd ..
```

- [ ] **Step 2: Migrate Departments**

Preserve `/api/rh/departments` methods and bodies. Use labelled fields, explicit destructive confirmation, focus restoration after form/modal close, and a table-to-stacked layout that does not create document overflow. Surface non-2xx responses without optimistic false success.

- [ ] **Step 3: Verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/departments-route.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "departments"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 4: Commit only after Step 3 is GREEN**

```powershell
git add 'src/app/(platform)/departamentos' tests/unit/platform/departments-route.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: migrate RH departments route"
```

## Task 5: Migrate Collaborator Management with role-appropriate privacy boundaries

**Files:**

- Modify: `src/app/(platform)/colaboradoras-gestao/page.tsx`
- Modify: `src/app/(platform)/colaboradoras-gestao/loading.tsx`
- Create: `src/app/(platform)/colaboradoras-gestao/colaboradoras-gestao.module.css`
- Create: `tests/unit/platform/collaborator-management-route.test.tsx`
- Modify: `tests/e2e/rh-route-migration.spec.ts`

- [ ] **Step 1: Activate the Collaborator Management lane and capture RED locally**

Remove the Collaborator Management `test.fixme` and cover search, filters, pagination, department assignment, profile edit, password reset, soft delete, pending/error states, confirmation language, and keyboard modal behavior. Necessary individual account and organization data is allowed; assert that the UI and intercepted payloads never contain individual health answers, diagnoses, exam results, health-risk classifications or scores, or health-derived fields. Run the focused cases to capture RED; do not stage or commit that state.

```powershell
npm run test:unit -- --run tests/unit/platform/collaborator-management-route.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "collaborator management"
cd ..
```

- [ ] **Step 2: Split rendering from mutations only where it reduces risk**

If `page.tsx` remains difficult to test, extract presentational sections or a typed mutation helper inside the same route directory. Preserve `/api/rh/users` query parameters and `/api/rh/users/:id` methods/bodies.

- [ ] **Step 3: Migrate layout and controls**

Provide a stable summary/filter/action hierarchy, semantic results count, responsive list/table, 44px primary and destructive actions, focus management, and visible non-color status.

- [ ] **Step 4: Verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/collaborator-management-route.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "collaborator management"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 5: Commit only after Step 4 is GREEN**

```powershell
git add 'src/app/(platform)/colaboradoras-gestao' tests/unit/platform/collaborator-management-route.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: migrate RH collaborator management"
```

## Task 6: Migrate aggregate Reports

**Files:**

- Modify: `src/app/(platform)/historico/page.tsx`
- Modify: `src/app/(platform)/historico/historico.module.css`
- Modify: `src/app/(platform)/historico/loading.tsx`
- Create: `tests/unit/platform/reports-route.test.tsx`
- Modify: `tests/e2e/rh-route-migration.spec.ts`

- [ ] **Step 1: Activate the Reports lane and capture RED locally**

Remove the Reports `test.fixme` and cover period/department filters, loading/error/empty states, chart/table text alternatives, mobile containment, and aggregate-only health/analytics/engagement response rendering. Fail if a row or tooltip identifies an employee alongside health data. Run the focused cases to capture RED; do not stage or commit that state.

```powershell
npm run test:unit -- --run tests/unit/platform/reports-route.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "reports"
cd ..
```

- [ ] **Step 2: Migrate the report surface**

Keep `/api/analytics/history?period=...&department=...` semantics. Use `PageHeader`, a semantic aggregate summary, labelled filters, readable chart fallbacks, and non-color trend indicators.

- [ ] **Step 3: Verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/reports-route.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "reports"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 4: Commit only after Step 3 is GREEN**

```powershell
git add 'src/app/(platform)/historico' tests/unit/platform/reports-route.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: migrate aggregate RH reports"
```

## Task 7: Migrate RH Configuration in two bounded slices

**Files:**

- Modify: `src/app/(platform)/company-profile/page.tsx`
- Modify: `src/app/(platform)/company-profile/company.module.css`
- Modify: `src/app/(platform)/company-profile/loading.tsx`
- Modify: `src/app/(platform)/gamificacao-config/page.tsx`
- Modify: `src/app/(platform)/gamificacao-config/gamificacao-config.module.css`
- Create: `tests/unit/platform/company-profile-route.test.tsx`
- Create: `tests/unit/platform/gamification-config-route.test.tsx`
- Modify: `tests/e2e/rh-route-migration.spec.ts`

- [ ] **Step 1: Activate the Company Profile lane and capture RED locally**

Remove the Company Profile `test.fixme` and cover edit/cancel/save, upload success/failure, preview, form labels, unsaved changes, loading/error feedback, and 44px actions. Run the focused cases to capture RED; do not stage or commit that state.

```powershell
npm run test:unit -- --run tests/unit/platform/company-profile-route.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "company profile"
cd ..
```

- [ ] **Step 2: Migrate Company Profile while preserving contracts**

Preserve `/api/company` reads/updates and `/api/upload/logo`. Apply shared platform primitives, labelled fields, clear pending/error/success feedback, 44px primary actions, and focus restoration without changing request methods or bodies.

- [ ] **Step 3: Verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/company-profile-route.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "company profile"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 4: Commit only after Step 3 is GREEN**

```powershell
git add 'src/app/(platform)/company-profile' tests/unit/platform/company-profile-route.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: migrate RH company profile"
```

- [ ] **Step 5: Activate Gamification Configuration and capture RED locally**

Remove the Gamification Configuration `test.fixme` and add cases for configuration fields/toggles, theme ordering, reward CRUD, redemption approval/rejection, lesson filters, lesson create/edit/delete/validation, schedule labels, editor-step validation, portals, and focus restoration. Run the focused cases to capture RED; do not stage or commit that state.

```powershell
npm run test:unit -- --run tests/unit/platform/gamification-config-route.test.tsx
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "gamification configuration"
cd ..
```

- [ ] **Step 6: Decompose the large module before visual migration**

Extract focused local components and typed helpers under `src/app/(platform)/gamificacao-config/components/` only after the local RED observation identifies the missing presentation contract. Preserve all existing `/api/gamification/*` and `/api/rh/lessons*` contracts and keep SWR mutation keys aligned with their original fetch keys.

- [ ] **Step 7: Apply platform presentation and verify focused and relevant gates are GREEN**

```powershell
npm run test:unit -- --run tests/unit/platform/gamification-config-route.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --grep "gamification configuration"
npx playwright test --config=playwright.config.ts --project=rh
cd ..
```

- [ ] **Step 8: Commit only after Step 7 is GREEN**

```powershell
git add 'src/app/(platform)/gamificacao-config' tests/unit/platform/gamification-config-route.test.tsx tests/e2e/rh-route-migration.spec.ts
git commit -m "refactor: migrate RH gamification configuration"
```

## Task 8: Remove migration aliases only after consumer proof

**Files:**

- Modify if proven safe: `src/components/ui/Button.tsx`
- Modify as indicated by search: migrated RH call sites
- Modify: `tests/unit/platform/primitives.test.tsx`

- [ ] **Step 1: Search for deprecated consumers**

```powershell
rg -n "variant=.*(outline|gold)|--(rose|gold|uni)-" 'src/app/(platform)/dashboard' 'src/app/(platform)/convites' 'src/app/(platform)/campanhas' 'src/app/(platform)/departamentos' 'src/app/(platform)/colaboradoras-gestao' 'src/app/(platform)/historico' 'src/app/(platform)/company-profile' 'src/app/(platform)/gamificacao-config'
```

- [ ] **Step 2: Remove aliases only when the whole repository has no required consumer**

If Admin or Collaborator still consumes an alias, document the owner and retain compatibility. Do not broaden this task into their redesign.

- [ ] **Step 3: Verify primitives and commit only if a real cleanup occurred**

```powershell
npm run test:unit -- --run tests/unit/platform/primitives.test.tsx
npm run test:unit
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=rh-route-migration --project=rh
cd ..
git diff --check
git add src/components/ui/Button.tsx tests/unit/platform/primitives.test.tsx
git commit -m "refactor: retire migrated RH compatibility aliases"
```

If search proves that compatibility must remain, record the consumers and finish this task without a commit; the branch must still be green.

## Task 9: Run the Wave 2 promotion gate and record evidence

**Files:**

- Create: `docs/qa/2026-07-15-uniher-platform-wave-2-scorecard.md`
- Update: `tests/e2e/rh-route-migration.spec.ts`
- Create/update: `tests/e2e/rh-route-migration.spec.ts-snapshots/*`

- [ ] **Step 1: Capture deterministic reference screenshots**

Choose at least one data-dense RH route and one form-heavy RH route at 1440x900 and 375x812. Stabilize dynamic data at the network boundary inside screenshot tests, disable animations/caret, mask nothing, and inspect every baseline at original resolution.

- [ ] **Step 2: Run the complete gate**

```powershell
npm run test:unit
npx tsc --noEmit
npm run build
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --project=rh-route-migration --project=master --project=rh --project=colaboradora
cd ..
git diff --check
```

Expected: every command exits `0`; no route-specific suite is skipped.

- [ ] **Step 3: Perform the runtime matrix**

At 1440x900, 1024x768, 768x1024, and 375x812, inspect every planned RH route for current location/role, keyboard order, drawer focus/restoration, modal focus, root overflow, 44px primary actions, AA text/placeholder/focus contrast, reduced motion, error/empty/loading behavior, and role-appropriate privacy. Health, analytics, engagement, and reporting must remain aggregate-only. Collaborator Management may display necessary individual account/organization identity and administrative data but no individual health, diagnosis, exam, or health-risk data. Use the standalone production runtime and record `/api/health` plus console/network failures.

- [ ] **Step 4: Write the scorecard with real evidence**

Record exact SHA, counts, routes, viewport observations, screenshot names, privacy probes, known warnings, remaining drift, and a PASS/FAIL promotion decision. A failed command, person-level health exposure, broken mutation, root overflow, or inaccessible primary flow is blocking.

- [ ] **Step 5: Commit verified Wave 2 evidence**

```powershell
git add tests/e2e/rh-route-migration.spec.ts tests/e2e/rh-route-migration.spec.ts-snapshots docs/qa/2026-07-15-uniher-platform-wave-2-scorecard.md
git commit -m "test: verify UniHER RH route migration"
```

## Final handoff

Report the reviewed SHA, exact test counts, scorecard decision, screenshot filenames, runtime matrix result, privacy evidence, remaining drift, and commit list. Do not begin Admin Master or Collaborator route redesign from this plan; create separate gated plans after Wave 2 passes.
