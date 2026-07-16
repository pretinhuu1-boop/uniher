# UniHER Platform Wave 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Execution record — 2026-07-15:** This historical plan was implemented locally on `codex/uniher-platform-wave1` through code baseline `606ede3`. Preserve its theme, shell, primitives, dashboard reference surface and test harness. Do not rerun it. Task 2's typed navigation infrastructure remains valid, but its route taxonomy and the original PASS scorecard are superseded by `../specs/2026-07-15-uniher-product-ia-roles-entitlements-privacy-design.md`. Wave 1.1 and Wave 1.2 must pass before promotion.

**Goal:** Build the shared Editorial Operational foundation, responsive application shell, typed navigation, state-complete primitives, and one RH dashboard reference surface without changing business rules or API contracts.

**Architecture:** Add semantic product tokens on top of the existing Tailwind v4 setup, move role navigation into typed configuration, and keep the authenticated layout as the sole owner of shell state. Shared UI primitives remain business-agnostic. The existing RH dashboard hook continues to supply data, while the page is decomposed into a view model and focused presentation sections.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4, CSS Modules, SWR, Chart.js, Vitest 4, Playwright 1.58.

---

## Scope and execution boundary

Execute this plan in a new dedicated worktree branched from the approved UniHER source branch. Do not implement RH secondary routes, Collaborator routes, or Admin Master route redesigns in this wave. Those become separate plans after the Wave 1 gate passes.

Existing behavior that must survive:

- authentication loading prevents protected-content flash;
- role-based navigation and collaborator-view switching;
- company identity fetch and unread notification count;
- RH onboarding redirect;
- dashboard data contract from `useDashboard()`;
- all current authorization and privacy rules.

## File map

### Create

- `vitest.config.ts` — node-based unit test configuration and `@/` alias.
- `tests/unit/platform/theme-contract.test.ts` — semantic token contract.
- `tests/unit/platform/navigation.test.ts` — role navigation grouping and route coverage.
- `tests/unit/platform/primitives.test.tsx` — server-rendered primitive/state contracts.
- `tests/unit/platform/dashboard-view-model.test.ts` — dashboard presentation mapping.
- `tests/e2e/platform-foundation.spec.ts` — shell, mobile drawer, focus, and overflow checks.
- `src/app/platform-theme.css` — platform-only semantic tokens, motion, radius, elevation, and z-index scale.
- `src/components/platform/navigation.ts` — typed navigation model and role helpers.
- `src/components/platform/AuthLoadingScreen.tsx` — branded auth skeleton.
- `src/components/platform/MobileTopbar.tsx` — mobile shell header.
- `src/components/platform/PageHeader.tsx` — consistent page context/title/action pattern.
- `src/components/platform/SummaryBand.tsx` — non-card summary metrics.
- `src/components/ui/FeedbackState.tsx` — empty, error, denied, and loading state pattern.
- `src/app/(platform)/dashboard/dashboard-view-model.ts` — maps hook data into presentation data.

### Modify

- `package.json` — add unit and Wave 1 verification scripts.
- `src/app/globals.css` — import platform theme and remove platform aliases that conflict with semantic tokens.
- `src/components/ui/Button.tsx` — semantic variants, loading state, and accessible progress label.
- `src/components/ui/Input.tsx` — description/error wiring and `aria-invalid`.
- `src/components/ui/Skeleton.tsx` — brand-neutral skeletons with reduced motion.
- `src/components/ui/AvatarBadge.tsx` — semantic badge roles; remove uppercase as a default.
- `src/components/platform/AppLayout.tsx` — compose loading screen, desktop shell, mobile topbar, and content landmark.
- `src/components/platform/AppLayout.module.css` — responsive shell geometry.
- `src/components/platform/Sidebar.tsx` — render typed groups and accessible drawer semantics.
- `src/components/platform/Sidebar.module.css` — espresso visual system and focus states.
- `src/components/platform/SidebarNavItem.tsx` — active-state semantics without tooltip-only affordances.
- `src/app/(platform)/dashboard/page.tsx` — reference composition using shared patterns.
- `src/app/(platform)/dashboard/dashboard.module.css` — focused dashboard layout; remove obsolete 1,300-line legacy rules.
- `tests/playwright.config.ts` — register the Wave 1 project.

### Delete after import verification

- `src/components/platform/StatCard.tsx` — replaced by `SummaryBand` on the reference dashboard.
- `src/components/platform/StatCard.module.css` — unused after `StatCard.tsx` removal.

Do not delete the older `Card.module.css`, `Button.module.css`, or `Badge.module.css` in this wave unless `rg` proves they have no imports outside the affected foundation. Avoid unrelated cleanup.

## Task 1: Establish the unit-test and semantic-theme contract

**Files:**

- Create: `vitest.config.ts`
- Create: `tests/unit/platform/theme-contract.test.ts`
- Create: `src/app/platform-theme.css`
- Modify: `package.json`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add the unit test scripts**

Add these scripts to `package.json` without changing existing commands:

```json
{
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:wave1": "npm run test:unit && cd tests && npx playwright test --config=playwright.config.ts --project=platform-foundation"
}
```

- [ ] **Step 2: Configure Vitest**

Create `vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

- [ ] **Step 3: Write the failing theme contract**

Create `tests/unit/platform/theme-contract.test.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/platform-theme.css'),
  'utf8',
);

describe('platform semantic theme', () => {
  it('defines the approved Editorial Operational roles', () => {
    expect(css).toContain('--platform-shell: #201812;');
    expect(css).toContain('--platform-canvas: #fff9f1;');
    expect(css).toContain('--platform-action: #b98643;');
    expect(css).toContain('--platform-positive: #536444;');
    expect(css).toContain('--platform-critical: #913337;');
    expect(css).toContain('--platform-ink: #211813;');
  });

  it('caps product radii and defines interaction timing', () => {
    expect(css).toContain('--platform-radius-surface: 14px;');
    expect(css).not.toMatch(/--platform-radius-surface:\s*(2[0-9]|[3-9][0-9])px/);
    expect(css).toContain('--platform-duration-fast: 150ms;');
    expect(css).toContain('--platform-duration-normal: 220ms;');
  });

  it('defines a semantic z-index scale', () => {
    expect(css).toContain('--z-dropdown: 20;');
    expect(css).toContain('--z-sticky: 30;');
    expect(css).toContain('--z-drawer-backdrop: 40;');
    expect(css).toContain('--z-drawer: 50;');
    expect(css).toContain('--z-modal: 70;');
    expect(css).toContain('--z-toast: 80;');
  });
});
```

- [ ] **Step 4: Run the theme contract and verify the expected failure**

Run:

```powershell
npm run test:unit -- tests/unit/platform/theme-contract.test.ts
```

Expected: FAIL with `ENOENT` for `src/app/platform-theme.css`.

- [ ] **Step 5: Implement the platform theme**

Create `src/app/platform-theme.css`:

```css
:root {
  --platform-shell: #201812;
  --platform-shell-soft: #33261d;
  --platform-shell-text: #fff7ec;
  --platform-canvas: #fff9f1;
  --platform-surface: #ffffff;
  --platform-group: #efe2d3;
  --platform-action: #b98643;
  --platform-action-strong: #8b622d;
  --platform-positive: #536444;
  --platform-critical: #913337;
  --platform-warning: #8a641c;
  --platform-ink: #211813;
  --platform-muted: #695b50;
  --platform-line: #e3d1bc;

  --platform-radius-control: 8px;
  --platform-radius-surface: 14px;
  --platform-radius-pill: 999px;
  --platform-shadow-raised: 0 4px 8px rgb(32 24 18 / 10%);

  --platform-duration-fast: 150ms;
  --platform-duration-normal: 220ms;
  --platform-ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  --z-dropdown: 20;
  --z-sticky: 30;
  --z-drawer-backdrop: 40;
  --z-drawer: 50;
  --z-modal-backdrop: 60;
  --z-modal: 70;
  --z-toast: 80;
  --z-tooltip: 90;
}

.platform-surface {
  color: var(--platform-ink);
  background: var(--platform-canvas);
}

@media (prefers-reduced-motion: reduce) {
  .platform-surface *,
  .platform-surface *::before,
  .platform-surface *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Import it immediately after Tailwind in `src/app/globals.css`:

```css
@import "tailwindcss";
@import "./platform-theme.css";
```

Keep landing-compatible legacy variables during Wave 1. New platform components must use only `--platform-*` tokens.

- [ ] **Step 6: Run the contract and build**

Run:

```powershell
npm run test:unit -- tests/unit/platform/theme-contract.test.ts
npm run build
```

Expected: theme tests PASS; production build exits `0`.

- [ ] **Step 7: Commit Task 1**

```powershell
git add package.json vitest.config.ts src/app/platform-theme.css src/app/globals.css tests/unit/platform/theme-contract.test.ts
git commit -m "feat: add UniHER platform semantic theme"
```

## Task 2: Extract typed role navigation and reduce top-level clutter

**Files:**

- Create: `tests/unit/platform/navigation.test.ts`
- Create: `src/components/platform/navigation.ts`
- Modify: `src/components/platform/Sidebar.tsx`

- [ ] **Step 1: Write the failing navigation tests**

Create `tests/unit/platform/navigation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getNavigationForRole, getRoleHome } from '@/components/platform/navigation';

describe('platform navigation', () => {
  it('groups RH routes by user intent', () => {
    const groups = getNavigationForRole('rh');
    expect(groups.map((group) => group.label)).toEqual([
      'Visão geral',
      'Pessoas e cuidado',
      'Engajamento',
      'Gestão',
    ]);
    expect(groups.flatMap((group) => group.items.map((item) => item.href))).toContain('/dashboard');
    expect(groups.flatMap((group) => group.items.map((item) => item.href))).toContain('/convites');
  });

  it('keeps collaborator and admin destinations isolated', () => {
    const collaboratorRoutes = getNavigationForRole('colaboradora')
      .flatMap((group) => group.items.map((item) => item.href));
    const adminRoutes = getNavigationForRole('admin')
      .flatMap((group) => group.items.map((item) => item.href));
    expect(collaboratorRoutes).not.toContain('/admin');
    expect(adminRoutes).not.toContain('/colaboradora');
  });

  it('returns the correct profile home', () => {
    expect(getRoleHome('admin')).toBe('/admin');
    expect(getRoleHome('rh')).toBe('/dashboard');
    expect(getRoleHome('lideranca')).toBe('/dashboard');
    expect(getRoleHome('colaboradora')).toBe('/colaboradora');
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing-module failure**

Run:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts
```

Expected: FAIL because `@/components/platform/navigation` does not exist.

- [ ] **Step 3: Implement the navigation model**

Create `src/components/platform/navigation.ts` with these public types and helpers:

```ts
import type { UserRole } from '@/types/platform';

export type NavigationIcon =
  | 'dashboard' | 'companies' | 'analytics' | 'colaboradoras'
  | 'departamentos' | 'semaforo' | 'campanhas' | 'objetivos'
  | 'desafios' | 'liga' | 'agenda' | 'historico' | 'invite'
  | 'profile' | 'config' | 'notifications' | 'conquistas';

export interface NavigationItem {
  href: string;
  label: string;
  icon: NavigationIcon;
  description: string;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const NAVIGATION: Record<UserRole, NavigationGroup[]> = {
  admin: [
    {
      label: 'Operação',
      items: [
        { href: '/admin', label: 'Visão geral', icon: 'companies', description: 'Exceções, empresas e integridade da plataforma' },
        { href: '/analytics-emails', label: 'Analytics global', icon: 'analytics', description: 'Comunicação e atividade agregada' },
      ],
    },
  ],
  rh: [
    { label: 'Visão geral', items: [
      { href: '/dashboard', label: 'Início', icon: 'dashboard', description: 'Atenção, ações e impacto' },
      { href: '/semaforo', label: 'Semáforo de saúde', icon: 'semaforo', description: 'Indicadores agregados de atenção' },
    ] },
    { label: 'Pessoas e cuidado', items: [
      { href: '/colaboradoras-gestao', label: 'Colaboradoras', icon: 'colaboradoras', description: 'Aprovações, perfis e status' },
      { href: '/departamentos', label: 'Departamentos', icon: 'departamentos', description: 'Estrutura e participação por setor' },
      { href: '/convites', label: 'Convites', icon: 'invite', description: 'Entrada de novas colaboradoras' },
      { href: '/agenda', label: 'Agenda de saúde', icon: 'agenda', description: 'Ações e lembretes de cuidado' },
    ] },
    { label: 'Engajamento', items: [
      { href: '/campanhas', label: 'Campanhas', icon: 'campanhas', description: 'Planejar e acompanhar campanhas' },
      { href: '/objetivos', label: 'Objetivos', icon: 'objetivos', description: 'Metas e recompensas' },
      { href: '/desafios/gerenciar', label: 'Desafios', icon: 'desafios', description: 'Configuração de desafios' },
      { href: '/liga/gerenciar', label: 'Ligas', icon: 'liga', description: 'Configuração de ligas' },
    ] },
    { label: 'Gestão', items: [
      { href: '/historico', label: 'Histórico', icon: 'historico', description: 'Relatórios e evolução' },
      { href: '/analytics-emails', label: 'Comunicação', icon: 'analytics', description: 'Entrega e leitura de mensagens' },
      { href: '/company-profile', label: 'Perfil da empresa', icon: 'profile', description: 'Dados e identidade corporativa' },
      { href: '/gamificacao-config', label: 'Gamificação', icon: 'config', description: 'Regras de XP, vidas e recompensas' },
    ] },
  ],
  lideranca: [
    { label: 'Equipe', items: [
      { href: '/dashboard', label: 'Início', icon: 'dashboard', description: 'Resumo da equipe' },
      { href: '/semaforo', label: 'Semáforo da equipe', icon: 'semaforo', description: 'Indicadores agregados' },
      { href: '/campanhas', label: 'Campanhas', icon: 'campanhas', description: 'Campanhas disponíveis' },
      { href: '/agenda', label: 'Agenda', icon: 'agenda', description: 'Próximas ações de saúde' },
    ] },
  ],
  colaboradora: [
    { label: 'Minha jornada', items: [
      { href: '/colaboradora', label: 'Hoje', icon: 'dashboard', description: 'Seu foco e suas próximas ações' },
      { href: '/semaforo', label: 'Meu semáforo', icon: 'semaforo', description: 'Sua leitura de cuidado' },
      { href: '/agenda', label: 'Minha agenda', icon: 'agenda', description: 'Exames, consultas e lembretes' },
    ] },
    { label: 'Evolução', items: [
      { href: '/campanhas', label: 'Campanhas', icon: 'campanhas', description: 'Conteúdos e ações disponíveis' },
      { href: '/objetivos', label: 'Objetivos', icon: 'objetivos', description: 'Metas de bem-estar' },
      { href: '/desafios', label: 'Desafios', icon: 'desafios', description: 'Atividades em andamento' },
      { href: '/conquistas', label: 'Conquistas', icon: 'conquistas', description: 'Marcos da sua jornada' },
      { href: '/liga', label: 'Liga semanal', icon: 'liga', description: 'Participação e comunidade' },
    ] },
  ],
};

export function getNavigationForRole(role: UserRole): NavigationGroup[] {
  return NAVIGATION[role] ?? NAVIGATION.colaboradora;
}

export function getRoleHome(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'colaboradora') return '/colaboradora';
  return '/dashboard';
}
```

- [ ] **Step 4: Update Sidebar to render groups**

Remove `NAV_ITEMS_BY_ROLE` and replace the flat-map setup with:

```ts
import { getNavigationForRole, getRoleHome } from './navigation';
import type { UserRole } from '@/types/platform';

const role = activeView as UserRole;
const navigationGroups = getNavigationForRole(role);

const handleSwitchView = (view: UserRole) => {
  setActiveView(view);
  sessionStorage.setItem('uniher-view-mode', view);
  router.push(getRoleHome(view));
  onClose();
};
```

Render every group inside the existing `<nav>` and keep Notifications and Settings in a final `Pessoal` group. Use the group label as a visible heading and do not hide route descriptions behind `?` tooltips.

- [ ] **Step 5: Verify tests and type safety**

Run:

```powershell
npm run test:unit -- tests/unit/platform/navigation.test.ts
npx tsc --noEmit
```

Expected: PASS; TypeScript exits `0`.

- [ ] **Step 6: Commit Task 2**

```powershell
git add src/components/platform/navigation.ts src/components/platform/Sidebar.tsx tests/unit/platform/navigation.test.ts
git commit -m "refactor: define role-based platform navigation"
```

## Task 3: Build state-complete shared primitives

**Files:**

- Create: `tests/unit/platform/primitives.test.tsx`
- Create: `src/components/ui/FeedbackState.tsx`
- Create: `src/components/platform/PageHeader.tsx`
- Create: `src/components/platform/SummaryBand.tsx`
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/components/ui/Input.tsx`
- Modify: `src/components/ui/Skeleton.tsx`
- Modify: `src/components/ui/AvatarBadge.tsx`

- [ ] **Step 1: Write server-rendered primitive tests**

Create `tests/unit/platform/primitives.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FeedbackState } from '@/components/ui/FeedbackState';
import PageHeader from '@/components/platform/PageHeader';

describe('platform primitives', () => {
  it('exposes a polite loading label and disables duplicate submission', () => {
    const html = renderToStaticMarkup(<Button isLoading>Salvar</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('Salvando…');
  });

  it('wires field errors to the input', () => {
    const html = renderToStaticMarkup(<Input id="name" label="Nome" error="Informe o nome" />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="name-error"');
    expect(html).toContain('id="name-error"');
  });

  it('renders an actionable empty state', () => {
    const html = renderToStaticMarkup(
      <FeedbackState
        kind="empty"
        title="Sua primeira campanha começa aqui."
        description="Escolha um tema e defina o público."
        action={<Button>Criar campanha</Button>}
      />,
    );
    expect(html).toContain('Sua primeira campanha começa aqui.');
    expect(html).toContain('Criar campanha');
  });

  it('keeps one primary page action', () => {
    const html = renderToStaticMarkup(
      <PageHeader title="Visão geral" description="O que merece atenção hoje." primaryAction={<Button>Convidar</Button>} />,
    );
    expect(html).toContain('Visão geral');
    expect(html).toContain('Convidar');
  });
});
```

- [ ] **Step 2: Run and verify missing props/components**

Run:

```powershell
npm run test:unit -- tests/unit/platform/primitives.test.tsx
```

Expected: FAIL for missing `FeedbackState`, `PageHeader`, and `ButtonProps.isLoading`.

- [ ] **Step 3: Implement Button and Input contracts**

Extend `ButtonProps` with `isLoading?: boolean` and render this structure:

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-full font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)] focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' && 'bg-[var(--platform-action)] text-[var(--platform-shell)] hover:bg-[var(--platform-action-strong)] hover:text-white',
        variant === 'secondary' && 'border border-[var(--platform-action)] text-[var(--platform-action-strong)] hover:bg-[var(--platform-group)]',
        variant === 'ghost' && 'text-[var(--platform-muted)] hover:bg-[var(--platform-group)]',
        variant === 'danger' && 'bg-[var(--platform-critical)] text-white hover:brightness-90',
        size === 'sm' && 'px-3 text-sm',
        size === 'md' && 'px-5 text-sm',
        size === 'lg' && 'min-h-12 px-6 text-base',
        size === 'icon' && 'size-11 p-0',
        className,
      )}
      {...props}
    >
      {isLoading ? 'Salvando…' : children}
    </button>
  ),
);
```

Update the `ButtonProps.variant` union to `primary | secondary | outline | ghost | gold | danger`. Keep `outline` as a visual alias of `secondary` and `gold` as a deprecated alias of `primary` during Wave 1 because `/campanhas` still consumes `outline`. Migrate the affected shell and dashboard call sites; remove compatibility aliases only in the later route-migration wave after `rg` shows no consumers.

In `Input.tsx`, derive IDs and add:

```tsx
const errorId = error && inputId ? `${inputId}-error` : undefined;
const descriptionId = description && inputId ? `${inputId}-description` : undefined;
const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
```

Pass `aria-invalid={Boolean(error)}` and `aria-describedby={describedBy}` to `<input>`. Render description and error with their derived IDs.

- [ ] **Step 4: Implement FeedbackState, PageHeader, and SummaryBand**

Use these public interfaces:

```tsx
// src/components/ui/FeedbackState.tsx
export interface FeedbackStateProps {
  kind: 'loading' | 'empty' | 'error' | 'denied';
  title: string;
  description: string;
  action?: React.ReactNode;
}

// src/components/platform/PageHeader.tsx
export interface PageHeaderProps {
  context?: string;
  title: string;
  description?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}

// src/components/platform/SummaryBand.tsx
export interface SummaryItem {
  label: string;
  value: string | number;
  detail?: string;
  state?: 'neutral' | 'positive' | 'warning' | 'critical';
}

export interface SummaryBandProps {
  label: string;
  items: SummaryItem[];
}
```

`FeedbackState` uses `role="alert"` only for `error` and `denied`; empty and loading use `role="status"`. `PageHeader` renders exactly one `<h1>`. `SummaryBand` uses a semantic `<section aria-label={label}>` and a `<dl>` rather than cards.

- [ ] **Step 5: Normalize Skeleton and Badge behavior**

Change skeleton color from generic gray to `var(--platform-group)` and add `aria-hidden="true"`. Update the badge variants to `neutral | positive | warning | critical | info`, remove automatic uppercase, and use semantic theme tokens.

- [ ] **Step 6: Verify primitives and TypeScript**

Run:

```powershell
npm run test:unit -- tests/unit/platform/primitives.test.tsx
npx tsc --noEmit
```

Expected: PASS; no TypeScript errors.

- [ ] **Step 7: Commit Task 3**

```powershell
git add src/components/ui/Button.tsx src/components/ui/Input.tsx src/components/ui/Skeleton.tsx src/components/ui/AvatarBadge.tsx src/components/ui/FeedbackState.tsx src/components/platform/PageHeader.tsx src/components/platform/SummaryBand.tsx tests/unit/platform/primitives.test.tsx
git commit -m "feat: add state-complete platform primitives"
```

## Task 4: Rebuild the authenticated shell and mobile drawer

**Files:**

- Create: `src/components/platform/AuthLoadingScreen.tsx`
- Create: `src/components/platform/MobileTopbar.tsx`
- Create: `tests/e2e/platform-foundation.spec.ts`
- Modify: `src/components/platform/AppLayout.tsx`
- Modify: `src/components/platform/AppLayout.module.css`
- Modify: `src/components/platform/Sidebar.tsx`
- Modify: `src/components/platform/Sidebar.module.css`
- Modify: `src/components/platform/SidebarNavItem.tsx`
- Modify: `tests/playwright.config.ts`

- [ ] **Step 1: Register a focused Playwright project**

Add this project to `tests/playwright.config.ts`:

```ts
{
  name: 'platform-foundation',
  testMatch: 'platform-foundation.spec.ts',
  use: { headless: true },
},
```

- [ ] **Step 2: Write the failing shell tests**

Create `tests/e2e/platform-foundation.spec.ts`. Use the existing admin seed credentials and `extractAccessTokenFromSetCookie()`; never hard-code a second base URL.

```ts
import { expect, test } from '@playwright/test';
import { extractAccessTokenFromSetCookie } from './helpers/auth';

const ADMIN_EMAIL = 'admin@uniher.com.br';
const ADMIN_PASSWORD = 'Admin@2026';

test.beforeEach(async ({ context, request, baseURL }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(response.ok()).toBeTruthy();
  const token = extractAccessTokenFromSetCookie(response);
  const url = new URL(baseURL!);
  await context.addCookies([{
    name: 'uniher-access-token',
    value: token,
    domain: url.hostname,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }]);
});

test('desktop shell uses the approved semantic structure', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/admin');
  const sidebar = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(sidebar).toBeVisible();
  await expect(sidebar).toHaveCSS('background-color', 'rgb(32, 24, 18)');
  await expect(page.locator('#main-content')).toBeVisible();
});

test('mobile drawer traps context and the page does not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await expect(page.getByRole('dialog', { name: 'Navegação' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Navegação' })).toBeHidden();
});

test('active navigation and focus remain visible', async ({ page }) => {
  await page.goto('/admin');
  const current = page.getByRole('link', { name: 'Visão geral' });
  await expect(current).toHaveAttribute('aria-current', 'page');
  await current.focus();
  await expect(current).toBeFocused();
  await expect(current).toHaveCSS('outline-style', 'solid');
});
```

- [ ] **Step 3: Run the shell tests and verify visual/semantic failures**

Run:

```powershell
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
```

Expected: FAIL because the current sidebar is white, the mobile drawer has no dialog semantics, and the button is labeled `Abrir menu`.

- [ ] **Step 4: Extract AuthLoadingScreen and MobileTopbar**

`AuthLoadingScreen` renders the real logo plus three brand-neutral skeleton lines inside `<div role="status" aria-label="Carregando sua área UniHER">`. Remove the spinning border indicator.

`MobileTopbar` accepts:

```ts
interface MobileTopbarProps {
  title?: string;
  onOpenNavigation: () => void;
}
```

Its menu button uses `aria-label="Abrir navegação"`, 44px dimensions, and the espresso surface. The title uses the sans UI font.

- [ ] **Step 5: Refactor AppLayout into the single shell owner**

`AppLayout.tsx` must have this composition:

```tsx
if (isLoading) return <AuthLoadingScreen />;

return (
  <div className={`${styles.shell} platform-surface`}>
    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    <div className={styles.workspace}>
      <MobileTopbar title={title} onOpenNavigation={() => setSidebarOpen(true)} />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        {children}
      </main>
    </div>
    <ReminderPopup />
    <ScrollToTop />
  </div>
);
```

`AppLayout.module.css` owns the 240px desktop rail, porcelain canvas, responsive content padding, and a `1280px` content maximum. Do not add page-load choreography.

- [ ] **Step 6: Implement the accessible espresso Sidebar**

Desktop sidebar remains an `<aside>` containing `<nav aria-label="Navegação principal">`. On mobile, the same aside receives `role="dialog"`, `aria-modal="true"`, and `aria-label="Navegação"` while open. Escape closes the drawer, opening focuses the first navigation link, and closing restores focus to the menu button through an `onClose` callback initiated by `MobileTopbar`.

`Sidebar.module.css` must use:

```css
.sidebar {
  color: var(--platform-shell-text);
  background: var(--platform-shell);
  border-right: 1px solid rgb(255 247 236 / 12%);
}

.navItem:hover,
.navItem:focus-visible {
  color: var(--platform-shell-text);
  background: rgb(255 247 236 / 9%);
}

.navItemActive {
  color: var(--platform-shell);
  background: var(--platform-shell-text);
}
```

Use the real logo asset. Do not invert or regenerate the wordmark. Remove the `?` tooltip control from `SidebarNavItem`; its description belongs in accessible text or contextual help, not a hover-only affordance.

- [ ] **Step 7: Run focused shell validation**

Run:

```powershell
npm run test:unit
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
```

Expected: all unit tests PASS; 3 Playwright tests PASS.

- [ ] **Step 8: Commit Task 4**

```powershell
git add src/components/platform/AuthLoadingScreen.tsx src/components/platform/MobileTopbar.tsx src/components/platform/AppLayout.tsx src/components/platform/AppLayout.module.css src/components/platform/Sidebar.tsx src/components/platform/Sidebar.module.css src/components/platform/SidebarNavItem.tsx tests/e2e/platform-foundation.spec.ts tests/playwright.config.ts
git commit -m "feat: rebuild the responsive UniHER platform shell"
```

## Task 5: Convert the RH dashboard into the reference surface

**Files:**

- Create: `tests/unit/platform/dashboard-view-model.test.ts`
- Create: `src/app/(platform)/dashboard/dashboard-view-model.ts`
- Modify: `src/app/(platform)/dashboard/page.tsx`
- Modify: `src/app/(platform)/dashboard/dashboard.module.css`
- Delete: `src/components/platform/StatCard.tsx`
- Delete: `src/components/platform/StatCard.module.css`

- [ ] **Step 1: Write the failing dashboard view-model test**

Create `tests/unit/platform/dashboard-view-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createDashboardViewModel } from '@/app/(platform)/dashboard/dashboard-view-model';

describe('RH dashboard view model', () => {
  it('prioritizes attention, action, and impact without exposing individual health data', () => {
    const model = createDashboardViewModel({
      kpis: [
        { label: 'Colaboradoras Ativas', value: 84, icon: 'users' },
        { label: 'Engajamento', value: '72%', icon: 'activity' },
      ],
      departments: [{ id: 'd1', name: 'Operações', collaborators: 20, points: 0, level: 0, badges: 0, engagementPercent: 61, examsPercent: 0, trend: 'stable', color: '#536444' }],
      campaigns: [{ name: 'Julho', month: 'Jul', progress: 82, status: 'active', statusLabel: 'Ativa', color: '#b98643' }],
      roi: { roiMultiplier: 2, savings: 'R$ 20 mil', absenteeismReduction: '8%' },
      engagement: [],
      ageDistribution: [],
    });

    expect(model.summary.map((item) => item.label)).toEqual([
      'Participação ativa',
      'Ações em andamento',
      'Pontos de atenção',
    ]);
    expect(model.actions[0].href).toBe('/campanhas');
    expect(JSON.stringify(model)).not.toMatch(/diagnóstico|paciente|individual/i);
  });
});
```

- [ ] **Step 2: Run and verify the missing-module failure**

Run:

```powershell
npm run test:unit -- tests/unit/platform/dashboard-view-model.test.ts
```

Expected: FAIL because `dashboard-view-model.ts` does not exist.

- [ ] **Step 3: Implement the dashboard view model**

Create types `DashboardSource`, `DashboardAction`, and `DashboardViewModel`. `createDashboardViewModel(source)` must:

- derive active participation from the engagement KPI when available, otherwise `0%`;
- count active campaigns as actions in progress;
- count departments below 70% engagement as attention points;
- map the first three actionable destinations to Campaigns, Invitations, and History;
- expose only aggregated department and campaign values;
- pass existing ROI, engagement, and age-distribution data through unchanged for the lower detail region.

Use typed imports from `src/types/platform.ts`; no `any` is permitted.

- [ ] **Step 4: Replace the dashboard composition**

Keep `useDashboard()`, `useAuth()`, the RH onboarding redirect, and existing filter state. Replace the top-level composition with:

```tsx
const model = createDashboardViewModel({
  kpis,
  departments,
  roi,
  campaigns,
  engagement,
  ageDistribution,
});

return (
  <div className={styles.page}>
    <PageHeader
      context="Visão geral · RH"
      title={`Bom dia, ${firstName}.`}
      description="O que merece sua atenção hoje."
      primaryAction={<Button onClick={() => router.push('/convites')}>Convidar</Button>}
      secondaryActions={<Button variant="secondary">Exportar</Button>}
    />
    {isLoading ? (
      <FeedbackState kind="loading" title="Preparando sua visão geral" description="Organizando indicadores agregados e próximas ações." />
    ) : (
      <>
        <SummaryBand label="Resumo da empresa" items={model.summary} />
        <section className={styles.primaryGrid}>
          <EngagementOverview data={model.engagement} />
          <NextActions actions={model.actions} />
        </section>
        <DashboardDetails model={model} filters={filters} onFiltersChange={setFilters} />
      </>
    )}
  </div>
);
```

Define `EngagementOverview`, `NextActions`, and `DashboardDetails` as focused local components in `page.tsx` during Wave 1. If any exceeds 100 lines, extract it into `src/app/(platform)/dashboard/components/` before commit.

- [ ] **Step 5: Replace legacy dashboard CSS**

Reduce `dashboard.module.css` to the classes used by the new composition. Required behavior:

- 8px spacing rhythm;
- two-column desktop primary region and one-column mobile region;
- no cards around every KPI;
- tables/lists use dividers;
- Chart.js containers have explicit min/max heights;
- empty states use `FeedbackState`, never emoji;
- no green gradient ROI banner; ROI becomes a restrained detail row with a sage state accent;
- no radius above 14px on surfaces;
- no horizontal overflow at 375px.

- [ ] **Step 6: Remove the obsolete StatCard**

Confirm imports first:

```powershell
rg -n "StatCard" src
```

Expected before deletion: only dashboard imports plus the component itself. Remove the dashboard import, then delete `StatCard.tsx` and `StatCard.module.css`.

- [ ] **Step 7: Run dashboard and shell validation**

Run:

```powershell
npm run test:unit -- tests/unit/platform/dashboard-view-model.test.ts
npx tsc --noEmit
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --project=rh
```

Expected: unit test PASS; TypeScript exits `0`; platform-foundation and RH projects PASS.

- [ ] **Step 8: Commit Task 5**

```powershell
git add src/app/(platform)/dashboard/page.tsx src/app/(platform)/dashboard/dashboard.module.css src/app/(platform)/dashboard/dashboard-view-model.ts tests/unit/platform/dashboard-view-model.test.ts
git rm src/components/platform/StatCard.tsx src/components/platform/StatCard.module.css
git commit -m "feat: establish the RH dashboard reference surface"
```

## Task 6: Complete the Wave 1 quality gate and handoff

**Files:**

- Modify: `tests/e2e/platform-foundation.spec.ts`
- Create: `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md`

- [ ] **Step 1: Add screenshot and reduced-motion assertions**

Append to `platform-foundation.spec.ts`:

```ts
test('desktop and mobile reference screenshots remain stable', async ({ page }) => {
  await page.goto('/admin');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page).toHaveScreenshot('platform-shell-desktop.png', { fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page).toHaveScreenshot('platform-shell-mobile.png', { fullPage: true });
});

test('reduced motion does not hide content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/admin');
  await expect(page.locator('#main-content')).toBeVisible();
  const animatedHiddenContent = await page.locator('[style*="opacity: 0"]').count();
  expect(animatedHiddenContent).toBe(0);
});
```

- [ ] **Step 2: Generate approved screenshot baselines**

Run once after human visual inspection:

```powershell
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --update-snapshots
```

Expected: screenshot baselines created under `tests/e2e/platform-foundation.spec.ts-snapshots/`.

- [ ] **Step 3: Run the complete Wave 1 gate**

Run:

```powershell
npm run test:unit
npx tsc --noEmit
npm run build
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation --project=master --project=rh --project=colaboradora
cd ..
git diff --check
```

Expected:

- all unit tests PASS;
- TypeScript exits `0`;
- production build exits `0`;
- platform foundation plus all three profile smoke projects PASS;
- `git diff --check` prints nothing.

- [ ] **Step 4: Perform manual browser QA**

At 1440×900, 1024×768, 768×1024, and 375×812, verify:

- current location and role are obvious;
- mobile drawer opens, closes with Escape, and restores focus;
- tab order follows visual order;
- no content is clipped or horizontally scrollable;
- primary actions remain 44px or taller;
- body and placeholder contrast meet AA;
- RH never sees individual health information;
- Collaborator and Admin routes retain their current behavior despite the new shell;
- reduced-motion mode leaves all content visible.

- [ ] **Step 5: Record the scorecard**

Create `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md` with this exact structure. Run `git rev-parse --short HEAD` and copy that real value into the reviewed-commit field. Copy the real test counts and concise observed notes from Steps 3 and 4; never commit the instructional wording shown below.

```md
# UniHER Platform Wave 1 Scorecard

## Result

- Decision: PASS or FAIL
- Commit under review: use the exact short SHA printed by `git rev-parse --short HEAD`
- Reviewed routes: `/admin`, `/dashboard`, `/colaboradora`, `/configuracoes`

## Automated evidence

- Unit tests: record the exact passed-test count
- TypeScript: PASS or FAIL
- Production build: PASS or FAIL
- Playwright: record the exact passed-test count
- Diff check: PASS or FAIL

## Manual evidence

- Desktop shell: PASS or FAIL — record the inspected viewport and result
- Mobile drawer/focus: PASS or FAIL — record keyboard and focus-restoration evidence
- Responsive overflow: PASS or FAIL — record the tested widths
- Contrast and focus visibility: PASS or FAIL — record the checked components
- Privacy boundary: PASS or FAIL — record the reviewed RH surface

## Remaining drift

- List each specific route or component deferred to a later wave; write `None` only when the audit found no drift

## Promotion

- Wave 2 RH plan may begin: YES or NO
- Blocking issue when NO: state the exact failing check; write `None` only when promotion is YES
```

Do not copy the instructional phrases into the evidence file and do not mark PASS with failed checks.

- [ ] **Step 6: Commit the verified Wave 1 evidence**

```powershell
git add tests/e2e/platform-foundation.spec.ts tests/e2e/platform-foundation.spec.ts-snapshots docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md
git commit -m "test: verify UniHER platform foundation"
```

## Final handoff after Wave 1

If and only if the scorecard is PASS, write the separate Wave 2 RH route-migration plan covering Dashboard follow-up, Invitations, Campaigns, Departments, Collaborator Management, Reports, and RH Configuration. Do not begin Wave 2 from this plan.
