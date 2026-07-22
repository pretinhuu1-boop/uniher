# UniHER Mobile Shell Findings Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os findings P1/P2/P3 da auditoria do shell mobile antes de qualquer commit ou avanço para as telas placeholder.

**Architecture:** Manter a bottom navigation como responsabilidade do `AppLayout`, mas aplicar o espaço inferior somente quando a navegação colaboradora estiver renderizada. O foco da Jornada será sincronizado com o fim do loading, a rota Comunidade terá uma barreira explícita de perfil, e o E2E terá fixtures que o teardown reconhece e valida.

**Tech Stack:** Next.js App Router, React, CSS Modules, `useAuth`, Playwright, Vitest, SQLite test database.

---

## Findings covered

| Finding | Correction | Gate |
|---|---|---|
| P1: `focus=journey` pode executar antes do título existir | Reexecutar o scroll quando `isLoading` terminar e testar visibilidade real do título | Jornada chega com `#journey-title` na viewport |
| P1: fixture mobile não é removido | Adicionar os padrões `mobile-*` e `Empresa Mobile%` ao teardown | Teardown reporta o fixture removido |
| P2: padding de 112px em RH/Admin | Aplicar classe de espaçamento somente ao workspace colaborador | RH/Admin mantém padding normal e não recebe bottom nav |
| P2: Comunidade sem boundary de perfil | Renderizar estado negado para perfis sem capacidade colaboradora | Admin/RH não acessam a experiência colaboradora |
| P2: E2E incompleto | Cobrir foco, ausência da nav para admin, dual-role e estados carregados | Testes falham se o contrato visual/regra regredir |
| P3: copy sem acentos | Corrigir os textos novos da navegação e Comunidade | UI mantém português editorial aprovado |

## Scope boundary

Este plano não implementa o feed real da Comunidade e não remove os placeholders de `/semaforo`, `/objetivos`, `/desafios`, `/conquistas` ou `/liga`. Também não reativa endpoints legados de gamificação.

## File map

- Modify `src/app/(platform)/colaboradora/page.tsx`: sincronizar o foco da Jornada com o fim do carregamento.
- Modify `src/components/platform/AppLayout.tsx`: aplicar a classe de espaçamento condicional ao workspace.
- Modify `src/components/platform/AppLayout.module.css`: mover o padding mobile para o workspace que possui bottom nav.
- Modify `src/components/platform/MobileBottomNav.tsx`: corrigir labels acessíveis e copy visível.
- Modify `src/app/(platform)/comunidade/page.tsx`: adicionar estado de loading/denied e copy corrigida.
- Modify `tests/global-teardown.ts`: limpar os fixtures mobile por padrões explícitos.
- Modify `tests/e2e/mobile-collaborator-shell.spec.ts`: validar foco, boundary de admin, ausência de overflow e fixture reconhecível.

### Task 1: Corrigir o foco real da Jornada

**Files:**
- Modify: `src/app/(platform)/colaboradora/page.tsx:141-149`
- Test: `tests/e2e/mobile-collaborator-shell.spec.ts`

- [ ] **Step 1: Atualizar o efeito para esperar o fim do loading.** Substituir o efeito atual por:

```tsx
  useEffect(() => {
    if (searchParams.get('focus') !== 'journey' || isLoading) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('journey-title')?.scrollIntoView({ block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isLoading, searchParams]);
```

- [ ] **Step 2: Adicionar uma asserção de viewport ao E2E.** Depois da navegação para Jornada, incluir:

```ts
    const journeyTitle = page.locator('#journey-title');
    await expect(journeyTitle).toBeVisible();
    await expect(journeyTitle).toBeInViewport();
```

- [ ] **Step 3: Rodar o teste focado.**

Run: `cd tests; npx playwright test --project=mobile-shell --config=playwright.config.ts`

Expected: `1 passed`, com `#journey-title` visível na viewport após a navegação.

- [ ] **Step 4: Commitar somente esta correção.**

```bash
git add "src/app/(platform)/colaboradora/page.tsx" tests/e2e/mobile-collaborator-shell.spec.ts
git commit -m "fix(mobile): preserve journey destination focus"
```

### Task 2: Fechar a higiene dos fixtures Playwright

**Files:**
- Modify: `tests/global-teardown.ts:15-25,47-49`
- Modify: `tests/e2e/mobile-collaborator-shell.spec.ts:22,32`

- [ ] **Step 1: Adicionar padrões específicos ao teardown.** O array de usuários deve conter:

```ts
      "email LIKE 'mobile-%'",
```

E a consulta de empresas deve conter:

```sql
OR name LIKE 'Empresa Mobile%'
```

- [ ] **Step 2: Tornar o nome do fixture explicitamente identificável.** Manter o contrato usado pelo teardown:

```ts
name: `Empresa Mobile ${suffix}`,
const collaboratorEmail = `mobile-${suffix}@empresa.com`;
```

- [ ] **Step 3: Rodar o E2E e observar o teardown.**

Run: `cd tests; npx playwright test --project=mobile-shell --config=playwright.config.ts`

Expected: o teste passa e o log final reporta pelo menos `1 test user` e `1 test company` removidos.

- [ ] **Step 4: Verificar que não sobrou fixture mobile no banco de teste.**

Run: `rg -n "mobile-|Empresa Mobile" data tests`

Expected: nenhum registro de fixture persistente em arquivos versionados; o banco temporário usado pelo Playwright foi limpo pelo teardown.

- [ ] **Step 5: Commitar a correção de higiene.**

```bash
git add tests/global-teardown.ts tests/e2e/mobile-collaborator-shell.spec.ts
git commit -m "test: clean mobile shell fixtures"
```

### Task 3: Tornar o espaçamento da bottom nav condicional

**Files:**
- Modify: `src/components/platform/AppLayout.tsx:31-46`
- Modify: `src/components/platform/AppLayout.module.css:180-198`
- Test: `tests/e2e/mobile-collaborator-shell.spec.ts`

- [ ] **Step 1: Adicionar uma classe condicional ao workspace.** Alterar o wrapper para:

```tsx
      <div
        className={`${styles.workspace} ${showCollaboratorMobileNav ? styles.workspaceWithMobileNav : ''}`}
        inert={sidebarOpen ? true : undefined}
      >
```

- [ ] **Step 2: Restringir o padding mobile ao workspace colaborador.** Substituir o bloco mobile atual por:

```css
@media (max-width: 768px) {
  .workspaceWithMobileNav .mainContent {
    padding-bottom: calc(112px + env(safe-area-inset-bottom));
  }

  .mobileBottomNav {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: calc(var(--z-sticky) + 1);
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
    background: var(--platform-surface);
    border-top: 1px solid var(--platform-line);
  }
}
```

- [ ] **Step 3: Cobrir o caso Admin mobile.** No E2E, autenticar `admin@uniher.com.br`, abrir `/configuracoes` em `375x812` e verificar:

```ts
    await expect(page.getByRole('navigation', { name: 'Navegação mobile' })).toHaveCount(0);
    await expect(page.locator('main')).toHaveCSS('padding-bottom', '48px');
```

- [ ] **Step 4: Verificar colaboradora e Admin juntos.**

Run: `cd tests; npx playwright test --project=mobile-shell --config=playwright.config.ts`

Expected: colaboradora vê quatro destinos e padding reservado; Admin não vê a nav nem o espaço extra.

- [ ] **Step 5: Commitar a correção de layout.**

```bash
git add "src/components/platform/AppLayout.tsx" "src/components/platform/AppLayout.module.css" tests/e2e/mobile-collaborator-shell.spec.ts
git commit -m "fix(mobile): scope bottom-nav layout spacing"
```

### Task 4: Fechar boundary da Comunidade e copy editorial

**Files:**
- Modify: `src/app/(platform)/comunidade/page.tsx`
- Modify: `src/components/platform/MobileBottomNav.tsx`
- Modify: `tests/e2e/mobile-collaborator-shell.spec.ts`

- [ ] **Step 1: Transformar a página em componente client com estado de perfil.** Usar:

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import PageHeader from '@/components/platform/PageHeader';
import { FeedbackState } from '@/components/ui/FeedbackState';

export default function CommunityPage() {
  const { isLoading, user } = useAuth();
  const canUseCollaboratorCommunity = user?.role === 'colaboradora' || user?.also_collaborator === 1;

  if (isLoading) {
    return <FeedbackState kind="loading" title="Carregando comunidade" description="Confirmando o escopo desta experiência." />;
  }

  if (!canUseCollaboratorCommunity) {
    return <FeedbackState kind="denied" title="Comunidade indisponível para este perfil" description="A comunidade é uma experiência privada para colaboradoras da empresa." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        context="Comunidade"
        title="Um espaço seguro para a sua empresa"
        description="O feed da empresa será liberado quando a comunidade estiver ativada para este ambiente."
      />
      <FeedbackState
        kind="empty"
        title="A comunidade ainda não foi ativada"
        description="Nenhum conteúdo foi publicado para esta empresa. Seus check-ins, semáforo e respostas da NR-1 permanecem privados."
      />
    </div>
  );
}
```

- [ ] **Step 2: Corrigir o label acessível da navegação.** Alterar para:

```tsx
<nav className={styles.mobileBottomNav} aria-label="Navegação mobile">
```

Manter os labels visíveis `Hoje`, `Comunidade`, `Jornada` e `Perfil`.

- [ ] **Step 3: Testar colaboradora e Admin na Comunidade.** O E2E deve confirmar que colaboradora vê `A comunidade ainda não foi ativada` e Admin vê `Comunidade indisponível para este perfil`.

- [ ] **Step 4: Rodar o teste focado e revisar a imagem.**

Run: `cd tests; npx playwright test --project=mobile-shell --config=playwright.config.ts`

Expected: pass em `375x812`, sem overflow, com copy acentuada e sem conteúdo de feed fictício.

- [ ] **Step 5: Commitar a boundary e a copy.**

```bash
git add "src/app/(platform)/comunidade/page.tsx" src/components/platform/MobileBottomNav.tsx tests/e2e/mobile-collaborator-shell.spec.ts
git commit -m "fix(mobile): close community access boundary"
```

### Task 5: Verificação independente e fechamento da rodada

**Files:**
- Test: `tests/e2e/mobile-collaborator-shell.spec.ts`
- Audit: `docs/superpowers/audits/2026-07-20-uniher-platform-redesign-readiness.md`
- Spec: `docs/superpowers/specs/2026-07-20-uniher-nr1-front-visual-audit.md`

- [ ] **Step 1: Rodar a suíte unitária completa.**

Run: `npm run test:unit`

Expected: `29` arquivos e `278` testes, ou número maior se novos testes unitários forem adicionados, todos passando.

- [ ] **Step 2: Rodar o build de produção.**

Run: `npm run build`

Expected: build concluído; o único warning permitido continua sendo o NFT tracing conhecido em `next.config.ts` / `src/app/api/admin/system/ops/route.ts`.

- [ ] **Step 3: Rodar o E2E mobile com teardown.**

Run: `cd tests; npx playwright test --project=mobile-shell --config=playwright.config.ts`

Expected: colaboradora, dual-role e Admin cobertos; Jornada focada; Comunidade negada para Admin; teardown remove os fixtures.

- [ ] **Step 4: Rodar `git diff --check` e revisar o write set.**

Run: `git diff --check; git status --short; git diff --stat`

Expected: sem erro de whitespace e somente arquivos previstos neste plano/documentação. Nenhum arquivo das cinco telas placeholder deve ser alterado nesta rodada.

- [ ] **Step 5: Atualizar os registros de auditoria.** Marcar os findings P1/P2/P3 como corrigidos somente com evidência dos testes. Manter Comunidade como `PARTIAL / CONTAINMENT ADAPTER` e as cinco telas como pendentes.

- [ ] **Step 6: Fazer um commit consolidado após a revisão.**

```bash
git add "src/app/(platform)/colaboradora/page.tsx" "src/app/(platform)/comunidade/page.tsx" src/components/platform/AppLayout.tsx src/components/platform/AppLayout.module.css src/components/platform/MobileBottomNav.tsx tests/global-teardown.ts tests/e2e/mobile-collaborator-shell.spec.ts docs/superpowers/audits/2026-07-20-uniher-platform-redesign-readiness.md docs/superpowers/specs/2026-07-20-uniher-nr1-front-visual-audit.md
git commit -m "fix: close mobile shell audit findings"
```

## Self-review

- Scope covered: all six findings da auditoria anterior têm tarefa, arquivo, teste e gate.
- Boundary preserved: o feed real e as telas placeholder não entram nesta correção.
- Main regression risks covered: loading race da Jornada, padding por perfil, acesso direto à Comunidade, copy acessível e vazamento de fixtures.
- Known residual warning: NFT tracing do admin ops continua documentado e não é introduzido por este plano.
