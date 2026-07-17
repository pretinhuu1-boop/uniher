# UniHER Wave 1.1 Corrective Mission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct sparse user preferences, literal Unicode copy on authenticated internal routes, and the stale Admin visual baseline, then close the Wave 1.1 internal-platform gate on one independently reviewed integrated candidate.

> **Scope amendment — 2026-07-17:** The user verified the correct public landing online and removed all public landing, root metadata/JSON-LD, account-email, and public-home-reachability work from this mission. This amendment overrides the obsolete public/email steps retained later in this historical plan text. Do not edit, stage, review as candidate work, or integrate `src/app/layout.tsx`, `src/lib/mail/templates.ts`, or `tests/unit/privacy/home-gamification-reachability.test.ts`. Task 2 is limited to the seven authenticated JSX files plus the AST, dashboard-unit, and RH browser tests named below.

**Architecture:** Three isolated worktrees prepare disjoint lanes from the same plan commit: Preferences, Copy/Unicode, and Visual Baseline. Their sessions may be created together, but implementation and browser gates are activated strictly in the order Preferences -> Copy -> Visual so the approved sequential-orchestration contract and shared server ports remain safe. The coordinator cherry-picks only reviewed lane commits, reruns focused evidence after each integration, runs the complete promotion gate sequentially, and writes the final scorecard against the frozen non-documentation commit.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Zod 4, Vitest 4, Playwright 1.58, better-sqlite3, Git worktrees.

---

## Execution topology

Coordinator worktree:

```text
C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave1-1-corrective
branch: codex/uniher-wave1-1-corrective
```

Prepared lanes created from the commit containing this plan:

| Lane | Branch | Worktree | Exclusive responsibility |
|---|---|---|---|
| Preferences | `codex/uniher-corrective-preferences` | `.worktrees/uniher-corrective-preferences` | Task 1 verification and corrective follow-up only |
| Copy | `codex/uniher-corrective-copy` | `.worktrees/uniher-corrective-copy` | Task 2 only |
| Visual | `codex/uniher-corrective-visual` | `.worktrees/uniher-corrective-visual` | Task 3 only |

Each lane must use explicit staging paths, run spec review before quality review, fix every blocking finding, and return one final reviewed code SHA. For Task 1, the existing implementation SHA is acceptable when review finds no required change; Tasks 2 and 3 must return one new scoped commit each. No lane may merge, push, deploy, edit the scorecard, start Wave 1.2, or touch `tests/unit/privacy/dsar-export-cooldown.test.ts` in any worktree.

Create all three sessions now, but activate only Preferences. Copy and Visual remain read-only and wait for an explicit coordinator activation message. After each active lane's receipt passes supervisor inspection, integrate that lane and run its focused check before activating the next lane. Never run two lane Playwright commands concurrently because all projects bind the same configured server port.

## Coordinator bootstrap: create the isolated lanes

- [ ] **Step 1: Freeze the plan commit and create branches/worktrees**

After committing this plan, run from the coordinator worktree:

```powershell
$repo = 'C:\Users\user\Documents\uniher-app-audit'
$planSha = git rev-parse HEAD

git -C $repo branch 'codex/uniher-corrective-plan' $planSha
git -C $repo worktree add '.worktrees/uniher-corrective-preferences' -b 'codex/uniher-corrective-preferences' $planSha
git -C $repo worktree add '.worktrees/uniher-corrective-copy' -b 'codex/uniher-corrective-copy' $planSha
git -C $repo worktree add '.worktrees/uniher-corrective-visual' -b 'codex/uniher-corrective-visual' $planSha
git -C $repo worktree list
```

Expected: three clean worktrees on distinct branches, all at the same plan SHA. Stop if any target branch/path already exists unexpectedly.

- [ ] **Step 2: Bootstrap dependencies without starting implementation**

Run `npm ci` once in each new worktree. This is environment preparation only. Do not run lane tests or modify source until the coordinator activates that lane.

## Task 1: Repair sparse preferences and prove first access

**Lane:** Preferences

**Files:**

- Create: `tests/unit/privacy/user-preferences-route.test.ts`
- Modify: `src/app/api/users/me/preferences/route.ts:19-24`
- Verify without modifying: `tests/e2e/wave-1-1-privacy.spec.ts:504-590`

**Recovered state:** Task 1 was already implemented locally in `dd0b285` before dispatch approval, and the coordinator contains that SHA. The Preferences lane starts from the final plan commit, treats Steps 1-5 below as the implementation contract/provenance, reruns all focused evidence, performs fresh spec and quality reviews, and creates a new scoped fix commit only if a blocking finding requires one. If no change is required, it returns `dd0b285` as the reviewed code SHA; it must not recreate or duplicate the patch.

- [ ] **Step 1: Create the failing route contract**

Create `tests/unit/privacy/user-preferences-route.test.ts` with an in-memory database and real write transaction:

```ts
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  enqueueCalls: 0,
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (...args: unknown[]) => unknown) => handler,
}));
vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => boundary.db,
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      boundary.enqueueCalls += 1;
      if (!boundary.db) throw new Error('test database not configured');
      return operation(boundary.db);
    },
  }),
}));

import { PATCH } from '@/app/api/users/me/preferences/route';

const context = {
  auth: {
    userId: 'user-1',
    role: 'colaboradora',
    companyId: 'company-1',
    email: 'ana@example.test',
  },
};

function request(preferences: Record<string, unknown>) {
  return new Request('http://localhost/api/users/me/preferences', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ preferences }),
  });
}

async function call(preferences: Record<string, unknown>) {
  return PATCH(request(preferences) as never, context as never);
}

beforeEach(() => {
  boundary.db = new Database(':memory:');
  boundary.db.exec(`
    CREATE TABLE user_preferences (
      user_id TEXT NOT NULL,
      pref_key TEXT NOT NULL,
      pref_value TEXT NOT NULL,
      updated_at TEXT,
      UNIQUE(user_id, pref_key)
    );
  `);
  boundary.enqueueCalls = 0;
});

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
});

describe('PATCH /api/users/me/preferences', () => {
  it('persists one allowed sparse preference', async () => {
    const response = await call({ first_access_tour_completed: '1' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(boundary.enqueueCalls).toBe(1);
    expect(boundary.db?.prepare(`
      SELECT user_id, pref_key, pref_value
      FROM user_preferences
    `).get()).toEqual({
      user_id: 'user-1',
      pref_key: 'first_access_tour_completed',
      pref_value: '1',
    });
  });

  it('accepts an empty patch without opening the write queue', async () => {
    const response = await call({});

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(boundary.enqueueCalls).toBe(0);
  });

  it.each([
    { unknown_preference: '1' },
    { notif_email: true },
  ])('rejects an invalid preference map without writing', async (preferences) => {
    const response = await call(preferences);

    expect(response.status).toBe(400);
    expect(boundary.enqueueCalls).toBe(0);
    expect(boundary.db?.prepare('SELECT COUNT(*) AS count FROM user_preferences').get())
      .toEqual({ count: 0 });
  });

  it('rejects privacy_ranking atomically with the typed private response', async () => {
    const response = await call({ privacy_profile: '1', privacy_ranking: '0' });

    expect(response.status).toBe(410);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
    expect(await response.json()).toEqual({
      status: 'unavailable',
      reason: 'privacy_review',
      message: 'Recurso temporariamente indisponível durante a revisão de privacidade.',
    });
    expect(boundary.enqueueCalls).toBe(0);
    expect(boundary.db?.prepare('SELECT COUNT(*) AS count FROM user_preferences').get())
      .toEqual({ count: 0 });
  });
});
```

- [ ] **Step 2: Record the recovered historical RED contract**

Do not rerun RED from the final plan SHA: it already contains `dd0b285`, so the same commands are GREEN. Record the recovery honestly with:

```powershell
git show e4ca21f:src/app/api/users/me/preferences/route.ts | Select-String 'z.record'
git show --stat --oneline dd0b285
```

Expected historical contract: parent `e4ca21f` used `z.record`, which rejects the sparse payload with `400`; `dd0b285` added the unit/browser regressions and minimal schema fix. The lane receipt marks this as `RECOVERED_RED` with parent and implementation SHAs, then supplies fresh GREEN outputs. Do not fabricate a current RED output.

- [ ] **Step 3: Implement the minimal schema correction**

Replace only the record declaration in `src/app/api/users/me/preferences/route.ts`:

```ts
const PatchSchema = z.object({
  preferences: z.partialRecord(
    z.enum(VALID_KEYS),
    z.string(),
  ),
});
```

Do not change the string-value contract, valid-key list, `privacy_ranking` branch, transaction, or response bodies.

- [ ] **Step 4: Verify GREEN and regressions**

Run:

```powershell
npm run test:unit -- tests/unit/privacy/user-preferences-route.test.ts
npm run test:unit -- tests/unit/privacy/user-preferences-route.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/aggregate-suppression.test.ts
Push-Location tests
npx playwright test --config=playwright.config.ts --project=privacy-wave-1-1 --grep "Pular tour persists"
Pop-Location
npx tsc --noEmit
git diff --check
```

Expected: all focused tests pass, the real PATCH returns `200`, the browser observes the refreshed authenticated projection, and TypeScript exits `0`.

- [ ] **Step 5: Commit the lane candidate, then review its exact SHA**

If the recovered `dd0b285` implementation remains unchanged, do not create a duplicate commit: record that SHA as `$laneSha`. If a blocking finding required a scoped fix, stage only the Task 1 write set and commit it first:

```powershell
git add -- `
  'src/app/api/users/me/preferences/route.ts' `
  'tests/unit/privacy/user-preferences-route.test.ts'
git diff --cached --check
git commit -m "fix: support sparse user preferences"
```

Then run a fresh independent spec review of the exact `$laneSha`, followed by a fresh quality review of the same SHA. Any fix creates a new SHA and invalidates both earlier reviews. Finish with `git status --short` and return the final reviewed code SHA plus receipts.

Expected: one scoped commit and a clean lane worktree.

## Task 2: Restore authenticated internal product copy

**Lane:** Copy

**Files:**

- Create: `tests/unit/platform/authenticated-jsx-copy.test.ts`
- Modify: `tests/unit/platform/dashboard-charts.test.tsx`
- Modify: `tests/e2e/rh.spec.ts`
- Modify: `src/app/(platform)/dashboard/page.tsx`
- Modify: `src/app/(platform)/dashboard/components/EngagementOverview.tsx`
- Modify: `src/app/(platform)/dashboard/components/DepartmentOverview.tsx`
- Modify: `src/app/(platform)/dashboard/components/DashboardDetails.tsx`
- Modify: `src/app/(platform)/dashboard/components/AgeOverview.tsx`
- Modify: `src/app/(platform)/historico/page.tsx`
- Modify: `src/app/(platform)/analytics-emails/page.tsx`

- [ ] **Step 1: Add the failing JSX AST contract**

Create `tests/unit/platform/authenticated-jsx-copy.test.ts`:

```ts
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const files = [
  'src/app/(platform)/dashboard/page.tsx',
  'src/app/(platform)/dashboard/components/EngagementOverview.tsx',
  'src/app/(platform)/dashboard/components/DepartmentOverview.tsx',
  'src/app/(platform)/dashboard/components/DashboardDetails.tsx',
  'src/app/(platform)/dashboard/components/AgeOverview.tsx',
  'src/app/(platform)/historico/page.tsx',
  'src/app/(platform)/analytics-emails/page.tsx',
] as const;

const unicodeEscape = /\\u(?:\{[0-9a-f]+\}|[0-9a-f]{4})/gi;

function findRawJsxEscapes(relativeFile: string): string[] {
  const sourceText = fs.readFileSync(path.join(process.cwd(), relativeFile), 'utf8');
  const sourceFile = ts.createSourceFile(
    relativeFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const findings: string[] = [];

  function visit(node: ts.Node) {
    let raw: string | undefined;
    if (ts.isJsxText(node)) raw = node.getText(sourceFile);
    if (
      ts.isJsxAttribute(node)
      && node.initializer
      && ts.isStringLiteral(node.initializer)
    ) {
      raw = node.initializer.getText(sourceFile);
    }
    if (raw && unicodeEscape.test(raw)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      findings.push(`${relativeFile}:${line}: ${raw}`);
    }
    unicodeEscape.lastIndex = 0;
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

describe('authenticated JSX copy', () => {
  it('contains no JavaScript Unicode escapes in JSX text or quoted attributes', () => {
    expect(files.flatMap(findRawJsxEscapes)).toEqual([]);
  });
});
```

- [ ] **Step 2: Strengthen authenticated rendered-copy tests**

> Amended scope: ignore the obsolete public/email example below. Do not edit or run candidate checks against `tests/unit/privacy/home-gamification-reachability.test.ts`, `src/app/layout.tsx`, or `src/lib/mail/templates.ts`.

In `tests/unit/platform/dashboard-charts.test.tsx`, add exact-label assertions and a raw-escape negative assertion:

```ts
expect(html).toContain('Participação');
expect(html).not.toMatch(/\\u[0-9a-f]{4}/i);
```

For the Age component markup, add:

```ts
expect(html).toContain('Distribuição');
expect(html).toContain('Faixas etárias protegidas');
expect(html).not.toMatch(/\\u[0-9a-f]{4}/i);
```

Extend `tests/unit/privacy/home-gamification-reachability.test.ts` with direct imports of `inviteEmailHtml` and `welcomeEmailHtml`, then add:

```ts
it('keeps the root layout and account emails free from quarantined promises', () => {
  const sources = new Map<string, string>([
    ['src/app/layout.tsx', fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8')],
    ['invite-email.html', inviteEmailHtml({
      inviterName: 'Rita',
      companyName: 'Empresa',
      inviteUrl: 'https://example.test/invite',
      role: 'colaboradora',
      expiresInDays: 7,
    })],
    ['welcome-email.html', welcomeEmailHtml({
      userName: 'Ana',
      companyName: 'Empresa',
      loginUrl: 'https://example.test/auth',
    })],
  ]);

  expect(findLegacyCopy(sources)).toEqual([]);
});
```

In the existing RH dashboard browser test, replace prefix-only accessible-name checks with exact names and add:

```ts
await expect(dashboardContent).not.toContainText(/\\u[0-9a-f]{4}/i);
await expect(page.getByRole('region', { name: 'Faixas etárias protegidas' })).toBeVisible();
await expect(page.getByRole('heading', { name: 'Contribuintes ativos por área' })).toBeVisible();
```

Add one authenticated browser test in the same serial RH describe:

```ts
test('Histórico e Comunicações renderizam copy portuguesa íntegra', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'uniher-access-token', value: rhToken, url: baseURL! }]);
  await completeAuthTourForDashboard(page);

  await page.goto('/historico');
  await expect(page.getByRole('heading', { name: 'Histórico protegido' })).toBeVisible();
  await expect(page.locator('#main-content')).not.toContainText(/\\u[0-9a-f]{4}/i);

  await page.goto('/analytics-emails');
  await expect(page.getByRole('heading', { name: 'Entregas de comunicação' })).toBeVisible();
  await expect(page.locator('#main-content')).not.toContainText(/\\u[0-9a-f]{4}/i);
});
```

- [ ] **Step 3: Verify RED**

Run:

```powershell
npm run test:unit -- tests/unit/platform/authenticated-jsx-copy.test.ts tests/unit/platform/dashboard-charts.test.tsx tests/unit/privacy/home-gamification-reachability.test.ts
npm run test:rh
```

Expected: the AST contract reports 27 JSX nodes across seven files; rendered exact-copy assertions fail; the root-layout/email contract reports legacy promises; RH browser assertions expose literal `\u` copy. Test setup failures are not accepted RED.

- [ ] **Step 4: Replace only defective JSX literals**

Replace raw JSX escapes with native UTF-8 Portuguese in the seven authenticated files. Required visible strings include:

```text
Visão geral · RH
Indicadores agregados com proteção de coorte.
Preparando sua visão protegida
Não foi possível carregar o dashboard
Atualize a página para tentar novamente.
Participação
Contribuintes ativos por área
Período
Distribuição
Faixas etárias protegidas
Distribuição indisponível
A faixa será exibida quando houver dados elegíveis.
Privacidade · RH
Histórico protegido
Histórico indisponível
Operação · RH
Entregas de comunicação
Métricas operacionais protegidas
```

Do not change escapes inside JavaScript expression strings, view models, APIs, CSV code, regexes, tests, or emoji literals.

- [ ] **Step 5: Enforce the amended public-surface exclusion**

> This heading and paragraph replace the obsolete instructions below: require the candidate and working-tree diffs to exclude `src/app/layout.tsx`, `src/lib/mail/templates.ts`, and `tests/unit/privacy/home-gamification-reachability.test.ts`. Do not apply the superseded public/email changes described below.

In `src/app/layout.tsx`, remove every public promise matched by the existing forbidden vocabulary. Use these canonical claims consistently in metadata, OpenGraph, Twitter, application JSON-LD, and FAQ answers:

```ts
const PUBLIC_TITLE = 'UniHER — Saúde Feminina Corporativa';
const PUBLIC_DESCRIPTION =
  'Plataforma corporativa de saúde feminina com jornadas educativas, campanhas, autocuidado e indicadores agregados protegidos para o RH.';
```

The constants may remain local to `layout.tsx`; do not create a new module. Remove `Gamificação`, `Duolingo`, badges, streaks, arena, dopamine, XP, ranking, rewards, and unsupported quantitative ROI/absenteeism/engagement promises from reachable metadata and JSON-LD.

In `src/lib/mail/templates.ts`, use exactly:

```html
<p>A UniHER reúne campanhas, conteúdos educativos e uma jornada privada de autocuidado para cada colaboradora.</p>
```

for invitations, and:

```html
<p>Agora você pode participar de campanhas, acessar conteúdos educativos e acompanhar sua jornada privada de autocuidado.</p>
```

for welcome email. Do not alter password-reset behavior or the quiz tip.

- [ ] **Step 6: Verify GREEN, commit, then review the exact SHA**

Run:

```powershell
npm run test:unit -- tests/unit/platform/authenticated-jsx-copy.test.ts tests/unit/platform/dashboard-charts.test.tsx tests/unit/privacy/home-gamification-reachability.test.ts
npm run test:rh
npm run test:unit
npx tsc --noEmit
git diff --check
```

Stage only the Task 2 write set and create the candidate commit:

```powershell
git add -- `
  'tests/unit/platform/authenticated-jsx-copy.test.ts' `
  'tests/unit/platform/dashboard-charts.test.tsx' `
  'tests/unit/privacy/home-gamification-reachability.test.ts' `
  'tests/e2e/rh.spec.ts' `
  'src/app/(platform)/dashboard/page.tsx' `
  'src/app/(platform)/dashboard/components/EngagementOverview.tsx' `
  'src/app/(platform)/dashboard/components/DepartmentOverview.tsx' `
  'src/app/(platform)/dashboard/components/DashboardDetails.tsx' `
  'src/app/(platform)/dashboard/components/AgeOverview.tsx' `
  'src/app/(platform)/historico/page.tsx' `
  'src/app/(platform)/analytics-emails/page.tsx' `
  'src/app/layout.tsx' `
  'src/lib/mail/templates.ts'
git diff --cached --check
git commit -m "fix: restore safe Portuguese platform copy"
```

Run a fresh independent spec review of the resulting SHA, then a fresh quality review of the same SHA. Any correction creates a new SHA and invalidates both reviews. Finish with `git status --short`.

Expected: one reviewed scoped commit and a clean lane worktree.

## Task 3: Align the intentional Admin visual baseline

**Lane:** Visual

**Files:**

- Modify: `tests/e2e/platform-foundation.spec.ts:219-240`
- Modify: `tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-desktop-platform-foundation-win32.png`
- Conditionally modify only after separate inspection: `tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-mobile-platform-foundation-win32.png`

- [ ] **Step 1: Freeze the semantic privacy state**

In `desktop and mobile authenticated admin references remain stable`, after `openStableAdminShell(page)` at desktop size and before the screenshot assertion, add:

```ts
await expect(page.getByRole('button', { name: /^Badges\b/ })).toHaveCount(0);
await expect(page.getByRole('button', { name: 'Sistema', exact: true })).toBeVisible();
await expect(page.getByRole('button', { name: 'Alertas', exact: true })).toBeVisible();
await expect(page.getByRole('button', { name: 'Auditoria', exact: true })).toBeVisible();
```

Do not restore the dormant `BadgesTab` function and do not edit `src/app/(platform)/admin/page.tsx`.

- [ ] **Step 2: Verify the existing screenshot is RED**

Run:

```powershell
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --grep "desktop and mobile authenticated admin references remain stable"
Pop-Location
```

Expected: semantic assertions pass, while `platform-shell-desktop.png` fails by approximately 1,345 pixels because the stored image still contains `Badges 6`.

- [ ] **Step 3: Regenerate the focused baseline**

Run:

```powershell
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --grep "desktop and mobile authenticated admin references remain stable" --update-snapshots
Pop-Location
git status --short
```

Expected: the desktop PNG changes. The mobile PNG remains unchanged unless the focused command proves and records a separate intentional delta.

- [ ] **Step 4: Inspect at original resolution**

Inspect old, new, and diff images at original resolution. Approve only this delta:

- `Badges 6` is absent;
- `Sistema`, `Alertas`, and `Auditoria` shift left;
- sidebar, cards, typography, colors, content, and geometry outside the tab row do not move.

If any other region changes, discard only the generated snapshot change with a non-destructive patch edit and investigate before continuing.

- [ ] **Step 5: Verify GREEN and commit the lane**

Run:

```powershell
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
Pop-Location
npm run test:unit -- tests/unit/privacy/gamification-safe-projection.test.ts
git diff --check
```

Stage only the Task 3 write set and create the candidate commit:

```powershell
git add -- `
  'tests/e2e/platform-foundation.spec.ts' `
  'tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-desktop-platform-foundation-win32.png'
if (git status --short -- 'tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-mobile-platform-foundation-win32.png') {
  git add -- 'tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-mobile-platform-foundation-win32.png'
}
git diff --cached --check
git commit -m "test: align Admin privacy visual baseline"
```

Run a fresh independent spec review of the resulting SHA, then a fresh quality review of the same SHA. Any correction creates a new SHA and invalidates both reviews. Finish with `git status --short`.

Expected: one reviewed scoped commit and a clean lane worktree.

## Task 4: Integrate, independently review, gate, and record Wave 1.1

**Lane:** Coordinator only

**Files:**

- Modify: `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md`
- Modify: `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md`, forward link only

- [ ] **Step 1: Confirm and integrate each active lane before activating the next**

For each lane, require:

- final branch-tip SHA and the ordered commit list after the shared plan SHA;
- RED and GREEN command outputs; Task 1 instead supplies the documented `RECOVERED_RED` receipt for `e4ca21f..dd0b285` plus fresh GREEN outputs;
- spec-review approval;
- quality-review approval;
- clean lane status;
- exact changed-file list matching its allowlist.

Reject a lane if any required receipt is absent or any file is out of scope. Process the order Preferences -> Copy -> Visual: validate and integrate Preferences, run its focused check, activate Copy; then repeat for Copy before activating Visual.

- [ ] **Step 2: Cherry-pick reviewed commits in dependency order**

Run from the coordinator worktree:

```powershell
$planSha = git rev-parse codex/uniher-corrective-plan
$preferencesTip = git rev-parse codex/uniher-corrective-preferences

$preferencesCommits = @(git rev-list --reverse "$planSha..$preferencesTip")
if ($preferencesCommits.Count -gt 0) {
  git cherry-pick $preferencesCommits
}
npm run test:unit -- tests/unit/privacy/user-preferences-route.test.ts

$copyTip = git rev-parse codex/uniher-corrective-copy
$copyCommits = @(git rev-list --reverse "$planSha..$copyTip")
if ($copyCommits.Count -gt 0) {
  git cherry-pick $copyCommits
}
npm run test:unit -- tests/unit/platform/authenticated-jsx-copy.test.ts tests/unit/platform/dashboard-charts.test.tsx tests/unit/privacy/home-gamification-reachability.test.ts

$visualTip = git rev-parse codex/uniher-corrective-visual
$visualCommits = @(git rev-list --reverse "$planSha..$visualTip")
if ($visualCommits.Count -gt 0) {
  git cherry-pick $visualCommits
}
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
Pop-Location
```

Expected: every commit after the shared plan SHA is applied in chronological order without conflict and every immediate integration check passes. Stop on the first conflict or failure; do not resolve by dropping lane behavior.

- [ ] **Step 3: Run final independent review**

Give a fresh reviewer the approved spec, this plan, base `f398d535`, and current candidate HEAD. Require a goal-backward review of:

- sparse validation and atomic fail-closed behavior;
- JSX AST guard precision;
- exact Portuguese runtime copy;
- absence of reachable legacy promises;
- screenshot delta scope;
- no DSAR, navigation, entitlement, or Wave 1.2 drift.

Any blocking finding returns to the owning lane and produces a new reviewed fix SHA. Integrate that fix as an additional explicit cherry-pick; do not rewrite history or discard reviewed behavior.

- [ ] **Step 4: Freeze candidate code commit and run the full gate**

Record:

```powershell
$candidate = git rev-parse HEAD
```

Then run sequentially:

```powershell
npm run test:unit
npx tsc --noEmit
npm run build
npm run test:wave1.1
npm run test:master
npm run test:seguranca
npm run test:rh
npm run test:colaboradora
npm run test:integrado
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
Pop-Location
```

Expected: every command exits `0`; record exact file/test counts and known NFT warnings. A skipped or failed command forces a final `FAIL` decision.

- [ ] **Step 5: Run and classify the required static inventories**

Run:

```powershell
rg -n "api/rh/agenda|alert_preferences|user_leagues|week_points|recalculateSemaforo|health_scores|UPDATE users SET points|SUM\(points\)|pointsEarned|xp_reward|holder_count|toPublicUser|recordHealthScore|INSERT INTO health_scores" src
rg -n "Urgente|Saudável|Liga Semanal|ranking|XP|pts" 'src/app/(platform)' src/components
rg -n "scheduled|cron|report|export" src/services src/app/api src/instrumentation.ts
git diff --check
git status --short
```

Classify every hit as unreachable quarantine code, schema/history, safe non-gamification wording, or a blocker. Require clean status before writing the scorecard.

- [ ] **Step 6: Replace the partial scorecard with exact evidence**

Write `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md` with these machine-readable lines near the top:

```text
- Reviewed code commit: `<the exact value stored in $candidate>`
- Decision: PASS
```

Use `FAIL` instead if any gate failed. Include exact command/result tables and the evidence categories required by section 9 of the design: Agenda self/negative probes, migration idempotence, gamification and Semáforo quarantine, 9/10/complementary/temporal suppression, API/UI/CSV/cache canaries, role/tenant/payload negatives, scheduled-job inventory, visual inspection, warnings, and remaining debt.

Add only a forward link to `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md`; do not rewrite its historical evidence.

- [ ] **Step 7: Commit documentation and verify the Wave 1.2 precondition**

Run:

```powershell
git add -- `
  'docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md' `
  'docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md'
git diff --cached --check
git commit -m "docs: record Wave 1.1 privacy gate"

$scorecard = Get-Content -Raw -LiteralPath 'docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md'
if ($scorecard -notmatch '(?m)^- Decision: PASS\s*$') { throw 'Wave 1.1 is not PASS' }
$reviewed = [regex]::Match($scorecard, '(?m)^- Reviewed code commit: `(?<sha>[0-9a-f]{7,40})`\s*$').Groups['sha'].Value
git merge-base --is-ancestor $reviewed HEAD
if ($LASTEXITCODE -ne 0) { throw 'Reviewed commit is not an ancestor' }
$nonDocsDrift = git diff --name-only "$reviewed..HEAD" -- . ':(exclude)docs/**'
if ($nonDocsDrift) { throw "Non-documentation drift after gate:`n$nonDocsDrift" }
if (git status --porcelain) { throw 'Corrective worktree is not clean' }
```

Expected: documentation commit only, reviewed code commit remains an ancestor, no non-documentation drift exists after it, and the corrective worktree is clean.

## Mission completion boundary

Completion means the corrective branch has reviewed lane commits, every required gate is green, the final scorecard truthfully records the frozen code SHA, and the worktree is clean. It does not authorize push, merge, deploy, PR creation, cleanup of other worktrees, dependency remediation, or Wave 1.2 execution.
