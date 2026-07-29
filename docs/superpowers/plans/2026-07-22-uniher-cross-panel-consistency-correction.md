# UniHER Cross-Panel Consistency Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** close the class of inconsistencies found after Dra. Paola's menu redesign: duplicated visible menu labels, ambiguous settings destinations, inconsistent role labels, and profile projections that show the wrong product role.

**Architecture:** Keep routes, authorization and module state unchanged. Centralize singular role labels in one helper, make navigation labels unique in each role shell, add regression tests that fail on duplicated visible link labels, and validate the main authenticated panels in browser after focused unit/type/build gates.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Testing Library, in-app browser validation, existing UniHER `docs/superpowers` harness/ledger.

---

## Harness Contract

**Source of truth**

- Stakeholder contract: `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- Runtime navigation source: `src/components/platform/navigation.ts`
- Sidebar runtime composition: `src/components/platform/Sidebar.tsx`
- Profile and account screen: `src/app/(platform)/configuracoes/page.tsx`
- Existing scorecard: `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4-regrouping-scorecard.md`
- Coordinator ledger: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

**Coordinator**

- Current Codex session owns review, integration, docs, browser validation and promotion decision.

**Write allowlist**

- `src/lib/users/role-label.ts`
- `src/components/platform/Sidebar.tsx`
- `src/components/platform/MobileBottomNav.tsx`
- `src/components/platform/navigation.ts`
- `src/app/(platform)/configuracoes/page.tsx`
- `src/app/(platform)/configuracoes/error.tsx`
- `src/app/(platform)/convites/page.tsx`
- `src/app/(platform)/colaboradoras-gestao/page.tsx`
- `src/app/(platform)/primeiro-acesso/page.tsx`
- `src/app/(platform)/admin/page.tsx`
- `src/app/invite/[token]/page.tsx`
- `src/lib/mail/templates.ts`
- `tests/unit/platform/role-label.test.ts`
- `tests/unit/platform/sidebar-capability.test.tsx`
- `tests/unit/platform/sidebar-navigation.test.tsx`
- `tests/unit/platform/navigation.test.ts`
- `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4-regrouping-scorecard.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

**Write denylist**

- No route renames or route removals.
- No auth, permission or module-entitlement behavior changes.
- No DB migration.
- No Yavix, NR-1, Semaforo, Liga, ranking, reward or sensitive health behavior activation.
- No SIPAT content creation.
- No staging, commit, deploy or production promotion unless the operator explicitly asks.

**Loop**

1. Preflight: inspect current status, Paola spec, navigation, role-label projections and known scorecards.
2. Observe: run targeted `rg` for duplicate labels, local role maps and "Configurações"/"Configuracoes" ambiguity.
3. Plan: classify findings as confirmed bug, intentional plural/audience label, or future-lane item.
4. Act: patch only confirmed projection bugs.
5. Verify: run focused unit tests, relevant suite, typecheck, build, diff-check and browser proof.
6. Reflect: update scorecard, ledger and Obsidian receipt.
7. Coordinator gate: only mark PASS when no confirmed P0/P1/P2 projection finding remains.

---

## File Structure

**Create**

- `src/lib/users/role-label.ts`: canonical singular user-role label helper.
- `tests/unit/platform/role-label.test.ts`: canonical role-label tests and source guard against local divergent maps.

**Modify**

- `src/components/platform/navigation.ts`: keep Admin platform settings route at `/admin?tab=sistema`, but label it as `Sistema` to distinguish it from personal account settings.
- `src/components/platform/Sidebar.tsx`: render personal account route as `Minha conta`; use canonical singular role helper in account footer and dual-role switcher.
- `src/components/platform/MobileBottomNav.tsx`: keep the compact `/configuracoes` mobile label as `Perfil`; it is a personal-profile shortcut, not a duplicated settings label.
- `src/app/(platform)/configuracoes/page.tsx`: use canonical role helper for the read-only `Papel` field.
- `src/app/(platform)/configuracoes/error.tsx`: keep user-facing Portuguese text accented in the account-settings error state.
- `src/app/(platform)/convites/page.tsx`: use canonical role helper for user/invite role badges.
- `src/app/(platform)/colaboradoras-gestao/page.tsx`: use canonical role helper for collaborator-management role badges.
- `src/app/(platform)/primeiro-acesso/page.tsx`: use canonical role helper for onboarding summary.
- `src/app/(platform)/admin/page.tsx`: derive local role option labels from the canonical helper to avoid drift.
- `src/app/invite/[token]/page.tsx`: use canonical role helper for the invite acceptance role display.
- `src/lib/mail/templates.ts`: use canonical role helper for invite e-mail role display.
- `tests/unit/platform/sidebar-navigation.test.tsx`: assert platform settings and personal settings have distinct visible labels.
- `tests/unit/platform/sidebar-capability.test.tsx`: assert no duplicate visible navigation link labels per role and canonical sidebar role labels.
- `tests/unit/platform/navigation.test.ts`: assert Admin taxonomy uses `Sistema`.
- Scorecard/ledger files listed in the allowlist.

---

## Task 1: Preflight And Finding Inventory

**Files:**

- Read: `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- Read: `src/components/platform/navigation.ts`
- Read: `src/components/platform/Sidebar.tsx`
- Read: `src/components/platform/MobileBottomNav.tsx`
- Read: `src/app/(platform)/configuracoes/page.tsx`
- Read: `src/app/(platform)/configuracoes/error.tsx`
- Read: `src/app/(platform)/convites/page.tsx`
- Read: `src/app/(platform)/colaboradoras-gestao/page.tsx`
- Read: `src/app/(platform)/primeiro-acesso/page.tsx`
- Read: `src/app/invite/[token]/page.tsx`
- Read: `src/lib/mail/templates.ts`

- [ ] **Step 1: Capture current dirty-state boundary**

Run:

```powershell
git status --short
```

Expected: dirty worktree is allowed; do not reset, stash, stage or commit. Preserve unrelated modified files, including pre-existing `src/app/(platform)/company-profile/page.tsx`, `src/services/objectives.service.ts` and untracked Yavix research if present.

- [ ] **Step 2: Inventory labels and role maps**

Run:

```powershell
rg -n "const ROLE_LABELS|function getRoleLabel|getUserRoleLabel|rh: 'Admin'|admin: 'Master'|Configurações|Configuracoes|Minha conta|Sistema|href: '/configuracoes'|href: '/admin\?tab=sistema'" src/app src/components src/lib tests/unit/platform
```

Expected: every singular user-role projection either already uses `getUserRoleLabel` or is listed as a confirmed correction target. Plural/audience labels such as `Colaboradoras` or alert audience maps are not corrected in this lane unless they are displayed as a singular user role.

- [ ] **Step 3: Classify findings**

Use this classification table:

| Finding pattern | Classification | Action |
|---|---|---|
| Two visible `Configurações` entries in one sidebar | confirmed bug | rename platform settings to `Sistema` and personal route to `Minha conta` |
| Admin profile page shows `Papel: Colaboradora` | confirmed bug | use canonical role helper |
| `rh` displayed as generic `Admin` in user/invite panels | confirmed bug | use `Admin Empresa` |
| `admin` displayed as `Master` in account shell | confirmed bug | use `Admin Master` |
| `Colaboradoras` as section/table title | intentional plural | leave unchanged |
| `Admin Master global` as alert audience | intentional audience label | leave unchanged |
| `Configurações` as page H1 for `/configuracoes` | acceptable route title | leave unchanged unless product asks for page-level rename |
| `Perfil` as compact mobile shortcut to `/configuracoes` | intentional mobile label | leave unchanged |
| `Configuracoes` without accent in account-settings error text | confirmed textual bug | use `Configurações` / `configurações` |

---

## Task 2: Canonical Role Label Helper

**Files:**

- Create/modify: `src/lib/users/role-label.ts`
- Create/modify: `tests/unit/platform/role-label.test.ts`

- [ ] **Step 1: Write the failing canonical role-label test**

In `tests/unit/platform/role-label.test.ts`, assert:

```ts
import { describe, expect, it } from 'vitest';
import { getUserRoleLabel } from '@/lib/users/role-label';

describe('user role labels', () => {
  it('renders the correct platform profile label for each role', () => {
    expect(getUserRoleLabel('admin')).toBe('Admin Master');
    expect(getUserRoleLabel('rh')).toBe('Admin Empresa');
    expect(getUserRoleLabel('lideranca')).toBe('Liderança');
    expect(getUserRoleLabel('colaboradora')).toBe('Colaboradora');
  });

  it('does not collapse unknown populated roles into collaborator', () => {
    expect(getUserRoleLabel('auditoria')).toBe('auditoria');
    expect(getUserRoleLabel(null)).toBe('Colaboradora');
  });
});
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npm run test:unit -- tests/unit/platform/role-label.test.ts
```

Expected before implementation: FAIL because `src/lib/users/role-label.ts` or `getUserRoleLabel` is missing.

- [ ] **Step 3: Implement canonical helper**

Create `src/lib/users/role-label.ts`:

```ts
import type { UserRole } from '@/types/platform';

const USER_ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  admin: 'Admin Master',
  rh: 'Admin Empresa',
  lideranca: 'Liderança',
  colaboradora: 'Colaboradora',
};

export function getUserRoleLabel(role: UserRole | string | null | undefined): string {
  if (!role) return 'Colaboradora';
  return USER_ROLE_LABELS[role as UserRole] ?? role;
}
```

- [ ] **Step 4: Run GREEN**

Run:

```powershell
npm run test:unit -- tests/unit/platform/role-label.test.ts
```

Expected: PASS.

---

## Task 3: Navigation Label Disambiguation

**Files:**

- Modify: `src/components/platform/navigation.ts`
- Modify: `src/components/platform/Sidebar.tsx`
- Modify: `tests/unit/platform/navigation.test.ts`
- Modify: `tests/unit/platform/sidebar-navigation.test.tsx`

- [ ] **Step 1: Update Admin taxonomy expected label test**

In `tests/unit/platform/navigation.test.ts`, ensure the Admin group for `/admin?tab=sistema` is:

```ts
{
  label: 'Sistema',
  items: [
    {
      href: '/admin?tab=sistema',
      label: 'Sistema',
      icon: 'config',
      description: 'Administradores UniHER, permissoes e configuracoes globais no painel master',
    },
  ],
}
```

Expected group labels:

```ts
expect(labels).toEqual([
  'Dashboard geral',
  'Empresas',
  'Saude Primaria',
  'Educacao',
  'Gamificacao',
  'Produtos e Modulos',
  'Relatorios',
  'Sistema',
]);
```

- [ ] **Step 2: Add sidebar label disambiguation regression**

In `tests/unit/platform/sidebar-navigation.test.tsx`, add:

```tsx
const ADMIN_WITH_PERSONAL_GROUPS = [
  {
    label: 'Admin',
    items: [
      {
        href: '/admin?tab=sistema',
        label: 'Sistema',
        icon: 'config',
        description: 'Configuracoes gerais da plataforma',
      },
    ],
  },
  {
    label: 'Pessoal',
    items: [
      {
        href: '/configuracoes',
        label: 'Minha conta',
        icon: 'config',
        description: 'Preferencias pessoais, senha e notificacoes',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

it('renders distinct labels for platform settings and personal account settings', () => {
  const html = renderToStaticMarkup(createElement(SidebarNavigationGroups, {
    groups: ADMIN_WITH_PERSONAL_GROUPS,
    pathname: '/configuracoes',
    onNavigate: vi.fn(),
    idPrefix: 'admin-personal-navigation',
  }));

  expect(html).toContain('Sistema');
  expect(html).toContain('Minha conta');
  expect(html).not.toContain('>Configurações<');
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/configuracoes"/);
});
```

- [ ] **Step 3: Run RED**

Run:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
```

Expected before implementation: FAIL where Admin still uses `Configuracoes` and personal sidebar still uses `Configurações`.

- [ ] **Step 4: Apply navigation changes**

In `src/components/platform/navigation.ts`, change the Admin settings group and item labels:

```ts
{
  label: 'Sistema',
  items: [
    {
      href: '/admin?tab=sistema',
      label: 'Sistema',
      icon: 'config',
      description: 'Administradores UniHER, permissoes e configuracoes globais no painel master',
    },
  ],
}
```

In `src/components/platform/Sidebar.tsx`, change the personal settings item:

```ts
{
  href: '/configuracoes',
  label: 'Minha conta',
  icon: 'config',
  description: 'Preferências pessoais, senha e notificações',
}
```

- [ ] **Step 5: Run GREEN**

Run:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
```

Expected: PASS.

---

## Task 4: Apply Canonical Role Labels Across User-Facing Panels

**Files:**

- Modify: `src/components/platform/Sidebar.tsx`
- Modify: `src/app/(platform)/configuracoes/page.tsx`
- Modify: `src/app/(platform)/convites/page.tsx`
- Modify: `src/app/(platform)/colaboradoras-gestao/page.tsx`
- Modify: `src/app/(platform)/primeiro-acesso/page.tsx`
- Modify: `src/app/(platform)/admin/page.tsx`
- Modify: `src/app/invite/[token]/page.tsx`
- Modify: `src/lib/mail/templates.ts`
- Modify: `tests/unit/platform/role-label.test.ts`
- Modify: `tests/unit/platform/sidebar-capability.test.tsx`

- [ ] **Step 1: Add source guard against local divergent maps**

In `tests/unit/platform/role-label.test.ts`, add:

```ts
import { readFileSync } from 'node:fs';

it('keeps user-facing panel role labels on the canonical helper', () => {
  const files = [
    'src/components/platform/Sidebar.tsx',
    'src/app/(platform)/configuracoes/page.tsx',
    'src/app/(platform)/convites/page.tsx',
    'src/app/(platform)/colaboradoras-gestao/page.tsx',
    'src/app/(platform)/primeiro-acesso/page.tsx',
    'src/app/invite/[token]/page.tsx',
    'src/lib/mail/templates.ts',
  ];

  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    expect(source).toContain('getUserRoleLabel');
    expect(source).not.toMatch(/rh:\s*['"]Admin['"]/);
    expect(source).not.toMatch(/admin:\s*['"]Master['"]/);
  }
});
```

- [ ] **Step 2: Add sidebar role-label regression**

In `tests/unit/platform/sidebar-capability.test.tsx`, add:

```tsx
it('uses canonical role labels in the account footer and view switcher', () => {
  mocks.user.role = 'admin';
  mocks.user.isMasterAdmin = true;
  render(<Sidebar isOpen={false} onClose={vi.fn()} />);
  expect(screen.queryByText('Admin Master')).not.toBeNull();

  cleanup();
  mocks.user.role = 'rh';
  mocks.user.isMasterAdmin = false;
  mocks.user.companyId = 'company-a';
  mocks.user.also_collaborator = 1;
  render(<Sidebar isOpen={false} onClose={vi.fn()} />);
  expect(screen.queryAllByText('Admin Empresa').length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByRole('button', { name: 'Admin Empresa' })).not.toBeNull();
});
```

- [ ] **Step 3: Add duplicate visible link-label regression**

In `tests/unit/platform/sidebar-capability.test.tsx`, add:

```tsx
it.each([
  'admin',
  'rh',
  'lideranca',
  'colaboradora',
] as const)('does not duplicate visible navigation labels for %s', (role) => {
  mocks.user.role = role;
  mocks.user.isMasterAdmin = role === 'admin';
  mocks.user.also_collaborator = 0;
  mocks.user.companyId = role === 'admin' ? undefined : 'company-a';

  render(<Sidebar isOpen={false} onClose={vi.fn()} />);

  const labels = screen
    .getAllByRole('link')
    .map((link) => link.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean);

  expect(labels).toEqual(Array.from(new Set(labels)));
});
```

- [ ] **Step 4: Run RED**

Run:

```powershell
npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/role-label.test.ts
```

Expected before implementation: FAIL where local `rh: 'Admin'`, `admin: 'Master'`, or duplicated visible link labels remain.

- [ ] **Step 5: Replace local role maps with canonical helper**

Use this pattern in each panel:

```ts
import { getUserRoleLabel } from '@/lib/users/role-label';
```

Replace singular role display expressions such as:

```ts
ROLE_LABELS[u.role] ?? u.role
```

with:

```ts
getUserRoleLabel(u.role)
```

Replace `/configuracoes` role loading:

```ts
setCargo(getUserRoleLabel(user.role));
```

Replace invite e-mail copy:

```ts
<strong>${getUserRoleLabel(data.role)}</strong>
```

Keep plural audience maps unchanged when they intentionally render `Colaboradoras`, `Admin Master global`, or segmented notification recipients.

- [ ] **Step 6: Run GREEN**

Run:

```powershell
npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/role-label.test.ts
```

Expected: PASS.

---

## Task 5: Runtime Browser Spot Check

**Files:**

- No source file modifications in this task.

- [ ] **Step 1: Validate Admin account profile**

Open authenticated route:

```text
http://localhost:3001/configuracoes
```

Expected visible state:

- Page title: `Configurações`
- `Papel` field value: `Admin Master`
- No `Papel: Colaboradora` for admin.

- [ ] **Step 2: Validate Admin shell navigation**

Open:

```text
http://localhost:3001/admin
```

Expected visible navigation labels:

- `Sistema` for `/admin?tab=sistema`
- `Minha conta` for `/configuracoes`
- No two visible link items both named `Configurações`.

- [ ] **Step 3: Validate query shortcuts**

Open:

```text
http://localhost:3001/admin?tab=empresas
http://localhost:3001/admin?tab=sistema
```

Expected:

- `Empresas` shortcut activates the company tab.
- `Sistema` shortcut activates the system tab.
- Base `/admin` dashboard item is not simultaneously active for query-specific tabs.

---

## Task 6: Verification Gate

**Files:**

- No source file modifications in this task.

- [ ] **Step 1: Focused consistency suite**

Run:

```powershell
npm run test:unit -- tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/role-label.test.ts
```

Expected: PASS, currently 4 files / 55 tests after the planned corrections.

- [ ] **Step 2: Relevant Paola/auth/module suite**

Run:

```powershell
npm run test:unit -- tests/unit/platform/use-auth-scope.test.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/role-label.test.ts tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/module-shells.test.ts
```

Expected: PASS, currently 8 files / 90 tests after the planned corrections.

- [ ] **Step 3: Typecheck**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Production build**

Run:

```powershell
npm run build
```

Expected: PASS, 146 static pages. The known Turbopack/NFT warning tracing `next.config.ts` via `src/app/api/admin/system/ops/route.ts` may still appear and is not caused by this correction lane.

- [ ] **Step 5: Whitespace/diff gate**

Run:

```powershell
git diff --check
```

Expected: PASS. LF/CRLF warnings are acceptable in this Windows worktree.

---

## Task 7: Documentation And Receipts

**Files:**

- Modify: `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p4-regrouping-scorecard.md`
- Modify: `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- Append: Obsidian `Mission/2026-07-22-uniher-paola-menu-redesign-spec.md`

- [ ] **Step 1: Update P4 scorecard**

Add a section named:

```markdown
## Cross-panel naming/role projection audit
```

Include these receipts:

```markdown
| Check | Result |
|---|---|
| Sidebar role labels | PASS; account footer and dual-role switcher now use the canonical role label helper instead of local `Master`/`Admin` labels. |
| Admin/user management labels | PASS; Admin user surfaces use the canonical helper for singular role labels. |
| Convites and Gestão de Colaboradoras labels | PASS; `rh` now renders as `Admin Empresa`, not generic `Admin`. |
| Invite acceptance and invite email labels | PASS; invitation role projection now uses the canonical helper. |
| Primeiro acesso labels | PASS; onboarding role summary now uses the canonical helper. |
| Duplicate navigation labels by role | PASS; regression renders Sidebar for `admin`, `rh`, `lideranca` and `colaboradora` and fails on duplicate visible link labels. |
| Source guard | PASS; regression blocks reintroducing local `rh: 'Admin'` and `admin: 'Master'` labels in user-facing panels covered by this audit. |
```

- [ ] **Step 2: Update ledger**

Add a coordinator decision:

```markdown
| 2026-07-22 | Complete cross-panel naming/role projection audit: Sidebar, Admin, Convites, Gestão de Colaboradoras, invite acceptance, Primeiro Acesso and invite email now use canonical singular role labels; duplicate visible navigation labels are covered by regression tests. | `src/lib/users/role-label.ts`, user-facing panel imports, `tests/unit/platform/sidebar-capability.test.tsx`, `tests/unit/platform/role-label.test.ts`, P4 scorecard | active |
```

- [ ] **Step 3: Write Obsidian receipt**

Append to `Mission/2026-07-22-uniher-paola-menu-redesign-spec.md`:

```markdown
## 2026-07-22 - Cross-panel consistency audit

- Audit request: search for errors similar to duplicated `Configuracoes` and wrong profile role labels across all panels.
- Findings fixed: Sidebar used local `Master`/`Admin` role labels; Convites and Gestão de Colaboradoras rendered `rh` as generic `Admin`; invite acceptance, Primeiro Acesso and invite email had local singular role label maps.
- Correction: canonicalized singular role projection through `src/lib/users/role-label.ts`; Admin platform settings remains `Sistema`; personal route remains `Minha conta`.
- Regression: Sidebar render test covers duplicate visible navigation labels for `admin`, `rh`, `lideranca` and `colaboradora`; role-label test blocks local `rh: 'Admin'` and `admin: 'Master'` in covered user-facing panels.
- Validation: focused suite PASS 4 files / 55 tests; relevant Paola/auth/module suite PASS 8 files / 90 tests; `npx tsc --noEmit` PASS; `npm run build` PASS with known Turbopack/NFT warning only.
```

- [ ] **Step 4: Final status report**

Run:

```powershell
git status --short
```

Expected: dirty worktree remains dirty; no stage/commit was performed by this lane.

---

## Self-Review

**Spec coverage**

- Admin `Configuracoes` concept remains captured as `Sistema` in runtime navigation while preserving `/admin?tab=sistema`.
- Personal `/configuracoes` remains available as `Minha conta`, preventing duplicate visible labels.
- Role labels are canonical across account footer, profile, management, invite and onboarding surfaces.
- Sensitive gates remain unchanged: no Yavix/NR-1 provisioning, no Semaforo/Liga activation, no module mutations.

**Placeholder scan**

- This plan contains no unresolved placeholder markers or unspecified "write tests" steps.
- Each task has exact files, commands and expected results.

**Type consistency**

- Canonical helper signature is `getUserRoleLabel(role: UserRole | string | null | undefined): string`.
- All planned imports use `@/lib/users/role-label`.
- Tests reference the same helper and paths.

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-07-22-uniher-cross-panel-consistency-correction.md`.

1. **Subagent-Driven (recommended)** - Dispatch one fresh subagent per task, then coordinator reviews and integrates receipts.
2. **Inline Execution** - Execute tasks in this session with checkpoints after Task 3, Task 4 and Task 6.

For this worktree, do not stage or commit unless the operator explicitly asks after reviewing the final diff.
