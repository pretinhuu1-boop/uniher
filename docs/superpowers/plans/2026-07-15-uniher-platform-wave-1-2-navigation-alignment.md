# UniHER Platform Wave 1.2 Navigation Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the reopened Wave 1 navigation taxonomy with the approved UniHER product areas for Collaborator, RH, Leadership and Admin Master while reusing only safe, existing routes.

**Architecture:** Keep the Wave 1 application shell, responsive drawer, active-route semantics, unread badge and role/view-switch behavior. Move the shared personal group into the typed navigation contract, express each role's primary map as immutable data, and verify the complete role map through unit and deterministic desktop/mobile browser tests. Hidden or future domains remain absent rather than becoming placeholder routes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Vitest 4, Playwright 1.58, CSS Modules.

---

## Hard precondition

Do not start Task 1 until `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md` exists, names the exact current code commit and records `PASS` for every required Wave 1.1 gate. If it is absent, stale or `FAIL`, stop and return to the Wave 1.1 plan.

The governing route and release contract is section 5 of `docs/superpowers/specs/2026-07-15-uniher-product-ia-roles-entitlements-privacy-design.md`.

This plan changes navigation configuration and its tests. It does not redesign destination pages, add route authorization, create hubs, enable ranking, implement entitlements, or build future product domains.

## Release rules that affect the map

- Collaborator sees `Hoje`, `Saúde Primária`, `Educação`, `Conquistas` and the shared `Pessoal` group.
- `Meu Semáforo` remains a real route but renders the Wave 1.1 `Em revisão` state.
- Liga/Classificação is absent through Wave 1.2 and may return only in Wave 2C after its own gate.
- RH sees dashboard, people/access, safe program destinations, communication and company profile.
- RH `Histórico agregado` remains absent because the eligible-action ledger does not exist yet.
- RH and Leadership do not see Agenda, Semáforo, Histórico or Liga.
- Leadership's Collaborator view uses the collaborator map and self scope; it never adds permissions.
- Admin Master remains intentionally small and receives no clinical route.
- Concierge, NR-1, denunciation, Viva SIPAT, Desenvolvimento Humano and `Como estou hoje` remain absent.
- `Pessoal` remains physically separate in `Sidebar` so the unread notification badge is preserved, even though it joins the complete-map test contract.

## Exact primary maps

### Collaborator

| Group | Item | Route |
|---|---|---|
| Início | Hoje | `/colaboradora` |
| Saúde Primária | Meu Semáforo | `/semaforo` |
| Saúde Primária | Minha Agenda | `/agenda` |
| Educação | Campanhas e conteúdos | `/campanhas` |
| Conquistas | Objetivos e recompensas | `/objetivos` |
| Conquistas | Desafios | `/desafios` |
| Conquistas | Minhas conquistas | `/conquistas` |

### RH

| Group | Item | Route |
|---|---|---|
| Visão geral | Início | `/dashboard` |
| Pessoas e acesso | Colaboradoras | `/colaboradoras-gestao` |
| Pessoas e acesso | Departamentos | `/departamentos` |
| Pessoas e acesso | Convites | `/convites` |
| Programas | Campanhas e educação | `/campanhas` |
| Programas | Objetivos e recompensas | `/objetivos` |
| Programas | Desafios | `/desafios/gerenciar` |
| Programas | Conteúdos e regras | `/gamificacao-config` |
| Relatórios e empresa | Comunicação | `/analytics-emails` |
| Relatórios e empresa | Perfil da empresa | `/company-profile` |

### Leadership

| Group | Item | Route |
|---|---|---|
| Equipe | Início | `/dashboard` |
| Programas | Campanhas e educação | `/campanhas` |
| Programas | Objetivos e recompensas | `/objetivos` |
| Programas | Desafios | `/desafios` |

### Admin Master

| Group | Item | Route |
|---|---|---|
| Operação | Visão geral | `/admin` |
| Operação | Analytics global | `/analytics-emails` |

### Shared personal group

| Group | Item | Route |
|---|---|---|
| Pessoal | Notificações | `/notificacoes` |
| Pessoal | Configurações | `/configuracoes` |

## File map

### Create

- `tests/e2e/platform-navigation-alignment.spec.ts`
- `docs/qa/2026-07-15-uniher-platform-wave-1-2-scorecard.md`

### Modify

- `src/components/platform/navigation.ts`
- `src/components/platform/Sidebar.tsx`
- `tests/unit/platform/navigation.test.ts`
- `tests/unit/platform/sidebar-navigation.test.tsx`
- `tests/playwright.config.ts`
- `package.json`
- `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md`

Do not modify `SidebarNavItem.tsx`, `AppLayout.tsx`, `MobileTopbar.tsx`, shell CSS or destination pages unless a failing Wave 1.2 test proves a regression in those files. If that happens, repair only the smallest affected contract and document the extra write in the scorecard.

## Task 1: Make the complete navigation contract typed and testable

**Files:**

- Modify: `src/components/platform/navigation.ts`
- Modify: `src/components/platform/Sidebar.tsx`
- Modify: `tests/unit/platform/navigation.test.ts`
- Modify: `tests/unit/platform/sidebar-navigation.test.tsx`

- [ ] **Step 1: Assert the exact Wave 1.1 gate before editing**

```powershell
$scorecardPath = 'docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md'
if (-not (Test-Path -LiteralPath $scorecardPath)) { throw 'Wave 1.1 scorecard ausente' }

$scorecard = Get-Content -Raw -LiteralPath $scorecardPath
if ($scorecard -notmatch '(?m)^- Decision: PASS\s*$') {
  throw 'Wave 1.1 não possui decisão final PASS'
}
$reviewedMatch = [regex]::Match(
  $scorecard,
  '(?m)^- Reviewed code commit: `(?<sha>[0-9a-f]{7,40})`\s*$'
)
if (-not $reviewedMatch.Success) {
  throw 'Wave 1.1 não registra o commit de código revisado'
}

$reviewed = $reviewedMatch.Groups['sha'].Value
git merge-base --is-ancestor $reviewed HEAD
if ($LASTEXITCODE -ne 0) { throw 'Commit revisado não pertence ao HEAD atual' }

$nonDocsDrift = git diff --name-only "$reviewed..HEAD" -- . ':(exclude)docs/**'
if ($nonDocsDrift) { throw "Código mudou após o gate Wave 1.1:`n$nonDocsDrift" }

if (git status --porcelain) { throw 'Worktree não está limpo' }
```

Expected: the scorecard records PASS on the current code baseline and the worktree is clean.

- [ ] **Step 2: Add the shared personal-map contract without changing role fixtures**

Keep the existing `EXPECTED_NAVIGATION` unchanged in this task. Add only `EXPECTED_PERSONAL_NAVIGATION`, `getCompleteNavigationForRole()` expectations, physical-route checks and complete-map uniqueness checks. Each exact role fixture and its deny-list assertions enters the RED step of Tasks 2–5 immediately before that role map is implemented.

- [ ] **Step 3: Add physical-route and global-uniqueness tests**

For every configured href, map `/x/y` to `src/app/(platform)/x/y/page.tsx` and assert the file exists. For every role, flatten primary plus personal routes and assert there are no duplicates. Keep the icon-registry and segment-boundary active-route tests.

- [ ] **Step 4: Run tests and verify they fail on the old taxonomy**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
```

Expected: FAIL only because the personal contract and `getCompleteNavigationForRole()` are not exported yet.

- [ ] **Step 5: Export the personal contract without changing badge rendering**

Move the immutable group from `Sidebar.tsx` to `navigation.ts`:

```ts
export const PERSONAL_NAVIGATION_GROUPS = [
  {
    label: 'Pessoal',
    items: [
      {
        href: '/notificacoes',
        label: 'Notificações',
        icon: 'notifications',
        description: 'Alertas e avisos do sistema para você',
      },
      {
        href: '/configuracoes',
        label: 'Configurações',
        icon: 'config',
        description: 'Preferências pessoais, senha e notificações',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

export function getCompleteNavigationForRole(role: UserRole): readonly NavigationGroup[] {
  return [...getNavigationForRole(role), ...PERSONAL_NAVIGATION_GROUPS];
}
```

`Sidebar.tsx` imports the constant but continues to render it in its second `SidebarNavigationGroups` call so the unread `Badge` remains scoped to `/notificacoes`.

- [ ] **Step 6: Run focused tests and commit**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
git add src/components/platform/navigation.ts src/components/platform/Sidebar.tsx tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
git commit -m "refactor: centralize complete platform navigation contract"
```

## Task 2: Implement the Collaborator product-area map

**Files:**

- Modify: `src/components/platform/navigation.ts`
- Modify: `tests/unit/platform/navigation.test.ts`

- [ ] **Step 1: Add exact group/order assertions**

Assert group labels are exactly:

```ts
expect(getNavigationForRole('colaboradora').map(group => group.label)).toEqual([
  'Início',
  'Saúde Primária',
  'Educação',
  'Conquistas',
]);
```

Assert the seven primary item labels/routes match the table and `/liga` is absent. Assert `Como estou hoje` and `Concierge` do not appear in any label or description.

- [ ] **Step 2: Run the Collaborator assertion and prove RED**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts
```

Expected: FAIL only on the exact Collaborator fixture/map; the shared contract and previous invariants remain green.

- [ ] **Step 3: Implement only the immutable map data**

Use these descriptions:

- Hoje: `Seu foco e suas próximas ações`;
- Meu Semáforo: `Seu recurso pessoal está em revisão`;
- Minha Agenda: `Exames, consultas e lembretes pessoais`;
- Campanhas e conteúdos: `Educação e ações disponíveis`;
- Objetivos e recompensas: `Participação voluntária sem dados de saúde`;
- Desafios: `Atividades voluntárias em andamento`;
- Minhas conquistas: `Marcos seguros da sua jornada`.

Do not add a hub route for any group label.

- [ ] **Step 4: Run and commit**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts
git add src/components/platform/navigation.ts tests/unit/platform/navigation.test.ts
git commit -m "feat: align collaborator product navigation"
```

## Task 3: Implement the RH map and keep blocked reports absent

**Files:**

- Modify: `src/components/platform/navigation.ts`
- Modify: `tests/unit/platform/navigation.test.ts`

- [ ] **Step 1: Add exact RH assertions**

Assert groups are `Visão geral`, `Pessoas e acesso`, `Programas`, `Relatórios e empresa` in that order. Assert the 10 primary routes from the table appear exactly once.

Assert `/agenda`, `/semaforo`, `/historico`, `/liga` and `/liga/gerenciar` are absent. `Histórico agregado` stays absent because Wave 1.1 quarantines rather than rebuilds the points ledger.

- [ ] **Step 2: Run the RH assertion and prove RED**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts
```

Expected: FAIL only on the RH map/deny-list; the Collaborator and shared contracts remain green.

- [ ] **Step 3: Implement the RH data map**

Use descriptions that state the safe role of each destination. In particular:

- Início: `Atenção, ações e impacto com privacidade`;
- Colaboradoras: `Acesso, perfis administrativos e status`;
- Campanhas e educação: `Planejamento de campanhas e aprendizagem`;
- Objetivos e recompensas: `Participação voluntária sem dados de saúde`;
- Conteúdos e regras: `Conteúdos e controles seguros disponíveis`;
- Comunicação: `Metadados operacionais protegidos`.

Do not call `/gamificacao-config` “Gamificação” and do not mention XP or ranking.

- [ ] **Step 4: Run and commit**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts
git add src/components/platform/navigation.ts tests/unit/platform/navigation.test.ts
git commit -m "feat: align RH product navigation"
```

## Task 4: Implement Leadership and self-view invariants

**Files:**

- Modify: `src/components/platform/navigation.ts`
- Modify: `tests/unit/platform/navigation.test.ts`
- Modify: `tests/unit/platform/sidebar-navigation.test.tsx`

- [ ] **Step 1: Add the exact Leadership map test**

Assert primary groups are `Equipe` and `Programas` with routes `/dashboard`, `/campanhas`, `/objetivos`, `/desafios`. Assert no people administration, company settings, Agenda, Semáforo, Histórico or Liga route appears.

- [ ] **Step 2: Preserve view-switch resolution tests**

Keep and extend:

```ts
expect(resolveActiveView('lideranca', true, 'colaboradora')).toBe('colaboradora');
expect(resolveActiveView('lideranca', true, 'rh')).toBe('lideranca');
expect(resolveActiveView('rh', false, 'colaboradora')).toBe('rh');
```

Resolve the projected map directly:

```ts
const activeView = resolveActiveView('lideranca', true, 'colaboradora');
expect(activeView).toBe('colaboradora');
expect(getNavigationForRole(activeView)).toEqual(EXPECTED_NAVIGATION.colaboradora);
```

The integrated proof of real role, switching and persistence belongs to Task 6. This unit test covers only the pure projection contract; API authorization remains server-owned.

- [ ] **Step 3: Run the Leadership assertions and prove RED**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
```

Expected: FAIL only on the Leadership map/projection; the Collaborator, RH and shared contracts remain green.

- [ ] **Step 4: Implement and commit**

Replace only `NAVIGATION.lideranca` with the exact two-group map from this plan; do not alter view-switch authorization or destination pages.

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
git add src/components/platform/navigation.ts tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
git commit -m "feat: align leadership and self-view navigation"
```

## Task 5: Lock the small Admin Master map and shared personal invariants

**Files:**

- Modify: `src/components/platform/navigation.ts`
- Modify: `tests/unit/platform/navigation.test.ts`

- [ ] **Step 1: Test Admin Master and personal maps**

Admin primary navigation contains only `/admin` and `/analytics-emails`. Its complete map adds `/notificacoes` and `/configuracoes` exactly once. Assert no collaborator, RH, clinical or future domain route exists.

For every role, assert the final two complete-map items are `Notificações` and `Configurações`, in that order.

- [ ] **Step 2: Verify the route-home contract remains unchanged**

```ts
expect(getRoleHome('admin')).toBe('/admin');
expect(getRoleHome('rh')).toBe('/dashboard');
expect(getRoleHome('lideranca')).toBe('/dashboard');
expect(getRoleHome('colaboradora')).toBe('/colaboradora');
```

- [ ] **Step 3: Run the complete unit gate and commit if needed**

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
```

If Tasks 2–4 already produced the exact passing Admin map, do not create an empty commit.

## Task 6: Add deterministic desktop/mobile role-map QA

**Files:**

- Create: `tests/e2e/platform-navigation-alignment.spec.ts`
- Modify: `tests/playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Register the browser project and script**

Add:

```ts
{
  name: 'navigation-wave-1-2',
  testMatch: 'platform-navigation-alignment.spec.ts',
  use: { headless: true, serviceWorkers: 'block' },
}
```

and:

```json
"test:wave1.2": "npm run test:unit -- tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx && cd tests && npx playwright test --config=playwright.config.ts --project=navigation-wave-1-2",
"test:wave1.2:update": "cd tests && npx playwright test --config=playwright.config.ts --project=navigation-wave-1-2 --update-snapshots"
```

- [ ] **Step 2: Build one deterministic authenticated render helper**

Authenticate with the seeded Admin account to pass the real protected shell, then intercept `/api/auth/me` only to project each visual role. The fixture must include `also_collaborator: 1` only for the explicit view-switch case. Fulfill `/api/notifications/count` with `{ unread: 2 }`, fulfill `/api/company` with stable UniHER data, and fulfill the preferences endpoints used by `/configuracoes` with stable empty/default payloads.

Use `/configuracoes` as the common destination because every role owns it. This E2E verifies rendering and interaction; Wave 1.1/security suites remain responsible for server authorization.

- [ ] **Step 3: Verify every desktop map at 1440x900**

For Admin, RH, Leadership and Collaborator, scope every exact-order, forbidden-route and future-domain assertion to `page.getByRole('navigation', { name: 'Navegação principal' })`:

- assert visible group labels and links in exact order;
- assert the role-specific forbidden routes and every future-domain label are absent;
- assert `Notificações` shows unread badge `2` and `Configurações` appears once;
- assert each visible link has a real `href`, accessible name and described text;
- assert `document.documentElement.scrollWidth <= clientWidth`;
- save only the stable shell region:

```ts
await expect(page.locator('aside')).toHaveScreenshot(`${role}-desktop.png`, {
  animations: 'disabled',
});
```

- [ ] **Step 4: Verify every mobile map at 375x812**

Open the drawer and scope map assertions to the `Navegação` dialog. Assert the same exact map, unique IDs, 44x44 close target, focus enters the first link, Tab remains trapped, Escape closes and restores focus to `Abrir navegação`. Assert no horizontal overflow and save the stable drawer region:

```ts
await expect(page.getByRole('dialog', { name: 'Navegação' })).toHaveScreenshot(
  `${role}-mobile.png`,
  { animations: 'disabled' },
);
```

This produces eight new baselines. Do not update the historical `platform-foundation` screenshots.

- [ ] **Step 5: Verify Leadership/RH collaborator-view switching**

Start with a switch-capable Leadership fixture. Click `Colaboradora`, assert navigation becomes the exact collaborator map and URL becomes `/colaboradora`. Reload and assert `sessionStorage['uniher-view-mode']` preserves the collaborator projection. Switch back and assert only the Leadership map returns.

Repeat the invariant for an RH fixture with `also_collaborator: 1`. Assert the collaborator view never contains RH routes.

- [ ] **Step 6: Run the project and commit**

```powershell
npm run test:wave1.2:update
# Inspect the eight PNGs at original resolution before accepting them.
npm run test:wave1.2
git add package.json tests/playwright.config.ts tests/e2e/platform-navigation-alignment.spec.ts tests/e2e/platform-navigation-alignment.spec.ts-snapshots
git commit -m "test: add Wave 1.2 role navigation QA"
```

## Task 7: Run regression QA and record the Wave 1.2 gate

**Files:**

- Create: `docs/qa/2026-07-15-uniher-platform-wave-1-2-scorecard.md`
- Modify: `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md`

- [ ] **Step 1: Run static and build gates**

```powershell
npm run test:unit
npx tsc --noEmit
npm run build
```

- [ ] **Step 2: Run privacy, navigation and shell gates**

```powershell
npm run test:wave1.1
npm run test:wave1.2
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
cd ..
```

- [ ] **Step 3: Run role regressions**

```powershell
npm run test:master
npm run test:seguranca
npm run test:rh
npm run test:colaboradora
npm run test:integrado
```

- [ ] **Step 4: Audit configured destinations and forbidden labels**

```powershell
rg -n "href: '/(liga|historico|concierge|nr1|denuncia|sipat|desenvolvimento-humano)'" src/components/platform/navigation.ts
rg -ni "label: '.*(classifica|concierge|nr-?1|den[uú]ncia|sipat|desenvolvimento humano|como estou hoje)" src/components/platform/navigation.ts
git diff --check
git status --short
```

Expected: both commands have no hits. The exhaustive typed role tests are the authoritative gate; these greps are complementary review only. Any manager-private or future route found by the typed tests is a blocker.

- [ ] **Step 5: Write the scorecard**

Record:

- Wave 1.1 PASS precondition and commit;
- exact Wave 1.2 code-gate fields:

```text
- Reviewed code commit: `<sha>`
- Decision: PASS
```

Use `- Decision: FAIL` when any required gate fails;
- exact role maps and deny-list result;
- physical-route existence result;
- four desktop and four mobile screenshot outcomes;
- drawer focus, Escape, touch target, unique-ID and overflow outcomes;
- view-switch persistence and navigation-projection isolation; server authorization is credited only to the Wave 1.1 and security suites;
- unit, TypeScript, build, privacy, shell and role-suite results;
- explicit `PASS` or `FAIL` promotion decision.

Update the historical Wave 1 scorecard with a forward link stating that its original navigation decision is superseded by the Wave 1.2 scorecard. Do not rewrite historical evidence.

- [ ] **Step 6: Commit the reviewed gate**

```powershell
git add docs/qa/2026-07-15-uniher-platform-wave-1-2-scorecard.md docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md
git commit -m "docs: record Wave 1.2 navigation gate"
```

## Completion criteria

Wave 1.2 is complete only when:

- Wave 1.1 remains green on the same branch;
- all four primary role maps and the shared personal map match this plan exactly;
- no blocked/future destination is configured or rendered;
- every configured destination has a real page;
- unread badge and active-route behavior survive;
- RH/Leadership collaborator-view switching shows self routes only and survives reload;
- desktop/mobile focus, Escape, touch target and overflow checks pass for every role;
- eight new navigation baselines pass without altering historical foundation baselines;
- unit, TypeScript, build, privacy, foundation, security and role regression suites pass;
- the Wave 1.2 scorecard says `PASS` on the exact reviewed commit.
