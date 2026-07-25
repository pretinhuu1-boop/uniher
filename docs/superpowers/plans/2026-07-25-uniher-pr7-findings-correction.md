# UniHER PR7 Findings Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the review findings found on PR #7 by restoring unit/whitespace gates, aligning NR-1 runtime access with route/API permissions, and preventing stuck loading states in the collaborator journey.

**Architecture:** Keep the current Paola menu redesign and governance model intact. Apply surgical fixes in the components and tests that already define the contract: navigation accessibility, module-aware routing, COPSOQ entitlement boundaries, collaborator actions, and CSS rhythm. No broad sidebar redesign, seed rewrite, or Yavix real integration work is included.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules, Vitest, Testing Library, SQLite-backed module entitlement helpers.

---

## Scope And Files

- Modify: `src/components/platform/SidebarNavItem.tsx`
  - Responsibility: preserve visual label/description/detail rendering while keeping each sidebar link's accessible name concise and deterministic.
- Modify: `src/app/(platform)/dashboard/dashboard.module.css`
  - Responsibility: restore the dashboard spacing contract.
- Modify: `src/app/(platform)/colaboradora/page.tsx`
  - Responsibility: prevent check-in/check-out buttons from staying disabled after network or refresh errors.
- Modify: `src/components/platform/navigation.ts`
  - Responsibility: route NR-1 module rows to the correct shell/runtime for each role.
- Modify: `tests/unit/platform/navigation.test.ts`
  - Responsibility: assert RH sees the management shell and collaborator sees COPSOQ runtime when NR-1 is enabled.
- Modify: `src/lib/nr1/runtime-entitlement.ts`
  - Responsibility: expose a request-level COPSOQ runtime entitlement that includes role gating.
- Modify: `src/app/(platform)/avaliacao-nr1/page.tsx`
  - Responsibility: redirect non-answering roles away from the COPSOQ answer flow before the client fetches protected APIs.
- Modify: `tests/unit/nr1-runtime-entitlement.test.ts`
  - Responsibility: lock the page/API role entitlement contract.
- Modify: `docs/superpowers/prompts/2026-07-23-uniher-paola-next-session-p6-handoff.md`
  - Responsibility: remove trailing blank EOF whitespace.

---

### Task 1: Restore Sidebar Accessible Names

**Files:**
- Modify: `src/components/platform/SidebarNavItem.tsx:169-184`
- Test: `tests/unit/platform/sidebar-capability.test.tsx`

- [ ] **Step 1: Run the failing sidebar tests first**

Run:

```powershell
npx vitest run tests/unit/platform/sidebar-capability.test.tsx
```

Expected: FAIL with queries unable to find `Comunidade`/`Dashboard` by exact link name or finding duplicate `Conteúdos educativos` links.

- [ ] **Step 2: Add a concise label to the link and keep rich text as description**

Change the `<Link>` opening tag to include `aria-label={label}`:

```tsx
<Link
  href={href}
  className={`${styles.navItem} ${VARIANT_CLASSES[variant]} ${isActive ? styles.navItemActive : ''}`}
  aria-label={label}
  aria-current={isActive ? 'page' : undefined}
  aria-describedby={descriptionId}
  onClick={onClick}
>
```

Keep the existing visible DOM unchanged:

```tsx
<span className={styles.navItemBody}>
  <span className={styles.navItemLabel}>{label}</span>
  <span id={descriptionId} className={styles.navItemDescription}>{description}</span>
  {details.length > 0 ? (
    <span className={styles.navItemDetails} aria-label="Resumo do item">
      {details.map(detail => (
        <span key={detail} className={styles.navItemDetail}>{detail}</span>
      ))}
    </span>
  ) : null}
</span>
```

- [ ] **Step 3: Verify sidebar tests**

Run:

```powershell
npx vitest run tests/unit/platform/sidebar-capability.test.tsx
```

Expected: PASS.

---

### Task 2: Restore Dashboard 8px Rhythm

**Files:**
- Modify: `src/app/(platform)/dashboard/dashboard.module.css:366-370`
- Test: `tests/unit/platform/dashboard-css.test.ts`

- [ ] **Step 1: Run the failing CSS contract**

Run:

```powershell
npx vitest run tests/unit/platform/dashboard-css.test.ts
```

Expected: FAIL with `padding: 12px (12px)`.

- [ ] **Step 2: Replace the non-contract padding**

Change:

```css
.comparisonList li {
  display: grid;
  min-width: 0;
  padding: 12px;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  border: 1px solid var(--platform-line);
  border-radius: var(--platform-radius-control);
}
```

To:

```css
.comparisonList li {
  display: grid;
  min-width: 0;
  padding: 16px;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  border: 1px solid var(--platform-line);
  border-radius: var(--platform-radius-control);
}
```

- [ ] **Step 3: Verify CSS contract**

Run:

```powershell
npx vitest run tests/unit/platform/dashboard-css.test.ts
```

Expected: PASS.

---

### Task 3: Prevent Stuck Check-In And Check-Out Loading

**Files:**
- Modify: `src/app/(platform)/colaboradora/page.tsx:217-240`
- Test: add focused coverage only if there is an existing test harness for this page; otherwise rely on unit suite plus visual smoke in Task 6.

- [ ] **Step 1: Replace `checkIn` with try/catch/finally**

Use this implementation:

```tsx
const checkIn = async () => {
  setCheckingIn(true);
  setMessage('');

  try {
    const response = await fetch('/api/gamification/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: checkInMood }),
    });
    setMessage(response.ok ? 'Check-in registrado.' : 'Seu check-in ja foi registrado hoje.');
    await refreshStreak();
  } catch {
    setMessage('Nao foi possivel registrar o check-in. Tente novamente.');
  } finally {
    setCheckingIn(false);
  }
};
```

- [ ] **Step 2: Replace `checkOut` with try/catch/finally**

Use this implementation:

```tsx
const checkOut = async () => {
  setCheckingOut(true);
  setMessage('');

  try {
    const response = await fetch('/api/wellbeing/check-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mood: checkOutMood }),
    });
    setMessage(response.ok ? 'Check-out registrado.' : 'Seu check-out ja foi registrado hoje.');
    await refreshStreak();
  } catch {
    setMessage('Nao foi possivel registrar o check-out. Tente novamente.');
  } finally {
    setCheckingOut(false);
  }
};
```

- [ ] **Step 3: Run TypeScript after text changes**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

---

### Task 4: Align NR-1 Navigation With Runtime Role Gates

**Files:**
- Modify: `src/components/platform/navigation.ts:401-403`
- Modify: `tests/unit/platform/navigation.test.ts:445-476`

- [ ] **Step 1: Change module href resolution to consider role**

Replace:

```ts
function getModuleNavigationHref(moduleSlug: CompanyModuleSlug, moduleState: CompanyModuleState): string {
  if (moduleSlug === 'nr1' && moduleState !== 'enabled') return '/nr1';
  return MODULE_NAVIGATION[moduleSlug].href;
}
```

With:

```ts
function getModuleNavigationHref(
  role: UserRole,
  moduleSlug: CompanyModuleSlug,
  moduleState: CompanyModuleState,
): string {
  if (moduleSlug === 'nr1') {
    if (moduleState !== 'enabled') return '/nr1';
    return role === 'colaboradora' || role === 'lideranca' ? '/avaliacao-nr1' : '/nr1';
  }

  return MODULE_NAVIGATION[moduleSlug].href;
}
```

Then update the call site:

```ts
const href = getModuleNavigationHref(role, module.module_slug, module.module_state);
```

- [ ] **Step 2: Update navigation tests to encode the role split**

Change the RH enabled expectation:

```ts
expect(enabledRoutes).toContain('/nr1');
expect(enabledRoutes).not.toContain('/avaliacao-nr1');
```

Add collaborator coverage in the same test:

```ts
const collaboratorRoutes = flatItems(getModuleAwareNavigationForRole('colaboradora', [
  moduleRow('nr1', 'enabled'),
])).map((item) => item.href);

expect(collaboratorRoutes).toContain('/avaliacao-nr1');
expect(collaboratorRoutes).not.toContain('/nr1');
```

Change the role visibility test:

```ts
expect(rhRoutes).toContain('/nr1');
expect(rhRoutes).not.toContain('/avaliacao-nr1');
```

- [ ] **Step 3: Verify navigation tests**

Run:

```powershell
npx vitest run tests/unit/platform/navigation.test.ts
```

Expected: PASS.

---

### Task 5: Block Non-Answering Roles At The COPSOQ Page

**Files:**
- Modify: `src/lib/nr1/runtime-entitlement.ts:9-34`
- Modify: `src/app/(platform)/avaliacao-nr1/page.tsx:17-20`
- Modify: `tests/unit/nr1-runtime-entitlement.test.ts:125-140`

- [ ] **Step 1: Extend request entitlement status**

Change the status type to include role denial:

```ts
export type Nr1RuntimeEntitlementStatus =
  | 'enabled'
  | 'missing_auth'
  | 'missing_company'
  | 'role_not_allowed'
  | 'not_enabled';
```

- [ ] **Step 2: Add role check after token verification**

In `getNr1RuntimeEntitlementForCurrentRequest`, change the try block to:

```ts
try {
  const payload = await verifyAccessToken(token);
  if (!payload.companyId) return 'missing_company';
  if (payload.role !== 'colaboradora' && payload.role !== 'lideranca') return 'role_not_allowed';
  return (await isNr1RuntimeEntitledForCompany(payload.companyId)) ? 'enabled' : 'not_enabled';
} catch {
  return 'missing_auth';
}
```

- [ ] **Step 3: Redirect role-denied users to the NR-1 shell**

In `src/app/(platform)/avaliacao-nr1/page.tsx`, keep:

```tsx
if (entitlement === 'missing_auth') redirect('/auth?redirect=%2Favaliacao-nr1');
if (entitlement !== 'enabled') redirect('/nr1');
```

This already redirects `role_not_allowed`; no page code change is needed beyond keeping this branch intact.

- [ ] **Step 4: Add unit coverage for the role gate**

In `tests/unit/nr1-runtime-entitlement.test.ts`, mock `getAccessToken`, `verifyAccessToken`, and `isTokenBlacklisted` if needed for direct helper coverage. Add this test:

```ts
it('does not allow RH/admin users to render the COPSOQ answer runtime', async () => {
  // Arrange the auth mocks so verifyAccessToken returns:
  // { userId: 'rh-user', companyId: 'company-enabled', role: 'rh' }
  await expect(getNr1RuntimeEntitlementForCurrentRequest()).resolves.toBe('role_not_allowed');
});
```

If direct helper mocking is too invasive in this file, add a source-contract assertion instead:

```ts
const entitlementSource = read('src/lib/nr1/runtime-entitlement.ts');
expect(entitlementSource).toContain("payload.role !== 'colaboradora'");
expect(entitlementSource).toContain("payload.role !== 'lideranca'");
expect(entitlementSource).toContain("'role_not_allowed'");
```

- [ ] **Step 5: Verify NR-1 tests**

Run:

```powershell
npx vitest run tests/unit/nr1-runtime-entitlement.test.ts tests/unit/platform/navigation.test.ts
```

Expected: PASS.

---

### Task 6: Clean Whitespace And Run Gates

**Files:**
- Modify: `docs/superpowers/prompts/2026-07-23-uniher-paola-next-session-p6-handoff.md:176`

- [ ] **Step 1: Remove the blank line after the closing code fence**

Ensure the file ends exactly at:

```md
```
```

with no extra blank line after it.

- [ ] **Step 2: Run whitespace gate**

Run:

```powershell
git diff --check origin/main...HEAD
```

Expected: no output and exit code 0.

- [ ] **Step 3: Run focused tests**

Run:

```powershell
npx vitest run tests/unit/platform/sidebar-capability.test.tsx tests/unit/platform/dashboard-css.test.ts tests/unit/platform/navigation.test.ts tests/unit/nr1-runtime-entitlement.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run full unit suite**

Run:

```powershell
npm run test:unit
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

Run:

```powershell
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6: Run build**

Run:

```powershell
npm run build
```

Expected: PASS. Known acceptable warning: existing Turbopack/NFT warning through `next.config.ts` and `src/app/api/admin/system/ops/route.ts`, if unchanged from previous build evidence.

- [ ] **Step 7: Visual smoke for affected routes**

Run the existing visual smoke harness or Playwright routes that cover:

```text
/dashboard
/colaboradora
/nr1
/avaliacao-nr1
```

Required states:

```text
RH with NR-1 enabled: sees /nr1 shell, not COPSOQ answer flow.
Colaboradora with NR-1 enabled: can reach /avaliacao-nr1.
Sidebar desktop: exact links remain scannable and active route remains highlighted.
Sidebar mobile: no overlap/regression in menu density.
Dashboard: comparison list spacing remains visually acceptable after 16px padding.
```

Save screenshots under the existing evidence convention in `docs/superpowers/evidence/` or the current external smoke output folder.

---

### Task 7: Commit And Push

**Files:**
- Stage only files touched by this plan.

- [ ] **Step 1: Review diff**

Run:

```powershell
git diff -- src/components/platform/SidebarNavItem.tsx src/app/(platform)/dashboard/dashboard.module.css src/app/(platform)/colaboradora/page.tsx src/components/platform/navigation.ts src/lib/nr1/runtime-entitlement.ts src/app/(platform)/avaliacao-nr1/page.tsx tests/unit/platform/navigation.test.ts tests/unit/nr1-runtime-entitlement.test.ts docs/superpowers/prompts/2026-07-23-uniher-paola-next-session-p6-handoff.md
```

Expected: only corrections described in this plan.

- [ ] **Step 2: Commit**

Run:

```powershell
git add src/components/platform/SidebarNavItem.tsx src/app/(platform)/dashboard/dashboard.module.css src/app/(platform)/colaboradora/page.tsx src/components/platform/navigation.ts src/lib/nr1/runtime-entitlement.ts src/app/(platform)/avaliacao-nr1/page.tsx tests/unit/platform/navigation.test.ts tests/unit/nr1-runtime-entitlement.test.ts docs/superpowers/prompts/2026-07-23-uniher-paola-next-session-p6-handoff.md docs/superpowers/plans/2026-07-25-uniher-pr7-findings-correction.md
git commit -m "fix: close UniHER PR7 review findings"
```

- [ ] **Step 3: Push**

Run:

```powershell
git push
```

Expected: PR #7 updates on GitHub.

---

## Self-Review

- Spec coverage: covers all five findings from the review: sidebar a11y/unit failures, dashboard spacing unit failure, check-in/out loading resilience, NR-1 role drift, and whitespace gate.
- Scope control: preserves Paola redesign visuals, existing module model, and Yavix mock/real integration boundary.
- Test gates: focused tests first, then full unit, typecheck, build, and visual smoke.
- Open risk: visual smoke route credentials/session setup may require using the existing UniHER smoke harness from prior evidence if direct login state is not already available.
