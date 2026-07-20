# UniHER NR-1 Front Preview - Visual Audit and Implementation Target

**Status:** implemented in isolated Wave 3 worktree; visual QA passed

**Date:** 2026-07-20

**Scope:** authenticated collaborator panel, desktop and mobile references for exposing the NR-1 scaffold as a controlled preview.

## 1. Approved decision

The NR-1 scaffold may be exposed from the collaborator panel as a **preview**. It must not be presented as a report, diagnosis, laudo, or proof of compliance.

The entry point is a journey item named `Avaliacao NR-1` with a small lock icon immediately beside the title. The lock means controlled access or contracted entitlement; it is not an error state.

Required copy:

- Badge: `Acesso controlado`
- Supporting text: `Previa da avaliacao psicossocial`
- Action: `Abrir previa`
- Privacy disclaimer: `Esta previa nao gera laudo ou comprovacao de conformidade.`

The preview is collaborator-facing. It must not expose individual answers, scores, mental-health classifications, or NR-1 results to RH, leadership, or the shared dashboard.

## 2. Canonical implementation location

The redesign target is:

`C:\Users\user\Documents\uniher-app-audit`

The approved Editorial Operational foundation is currently represented in:

`C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-platform-wave1`

That foundation contains the shared shell, platform tokens, grouped navigation, page header, summary band, feedback states, and the first responsive reference surface. The collaborator route was the constrained Wave 3 placeholder; the final journey composition is now implemented in the dedicated Wave 3 worktree below.

The NR-1 scaffold is isolated in:

`C:\Users\user\Documents\uniher-nr1-branch-audit`

It is currently a detached checkout at `808e10c`. It contains the COPSOQ mock route and components, but it is not the correct place to implement the platform redesign. Its reusable NR-1 code should be integrated selectively after the collaborator worktree is created from the validated Editorial Operational foundation.

## 3. Correct next worktree

After the Wave 1 foundation gate is closed and its intended commit is clean, create a dedicated collaborator worktree from the foundation branch:

`C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`

Do not edit the root checkout for this feature. Do not implement the collaborator redesign directly in the detached NR-1 checkout.

Implementation ownership in that worktree:

- `src/app/(platform)/colaboradora/page.tsx`: collaborator home composition and journey entry point; implemented;
- `src/components/platform/navigation.ts`: preserve the approved role navigation; do not add a generic top-level `Avaliacoes` item without a separate decision;
- `src/components/platform/*`: reuse the shared shell, page header, summary band, buttons, badges, and feedback states;
- `src/app/platform-theme.css`: use the existing Editorial Operational tokens;
- `src/components/copsoq/*`, `src/hooks/useCopsoq.ts`, and `/api/yavix/copsoq/*`: selectively integrated from the scaffold;
- a small journey-row component may be added only if it removes real duplication and remains profile-agnostic.

## 4. Visual reference audit

References used to generate the approved desktop and mobile images:

- `C:\Users\user\Documents\uniher-app-audit\screenshots\02-dashboard-rh.jpg`
- `C:\Users\user\Documents\uniher-landing-release\assets\design-reference-uniher-final-clean.png`
- `C:\Users\user\Documents\uniher-app-audit\arquivos_base_inspiracao\nova identidade\WhatsApp Image 2026-03-23 at 22.27.05.jpeg`
- `C:\Users\user\Documents\uniher-app-audit\docs\superpowers\specs\2026-07-15-uniher-platform-editorial-operational-redesign.md`

### 4.1 Desktop - PASS

- Espresso navigation rail and porcelain work canvas are aligned with the approved shell.
- Bronze/gold action color, sage status accents, editorial headings, and sans-serif controls are consistent.
- The primary action is visible before the journey list.
- The summary is a ruled horizontal band rather than a generic metric-card grid.
- `Avaliacao NR-1` has the lock beside the title, controlled-access badge, preview action, and disclaimer.
- The composition does not show fabricated clinical results or an NR-1 report.
- The journey is represented as an ordered list, matching the documented operational direction.

### 4.2 Mobile - PASS WITH REPAIR NOTES

- The layout is recomposed vertically instead of simply shrinking the desktop.
- The mobile header keeps brand, account context, and menu access.
- The NR-1 lock, badge, action, and disclaimer remain visible.
- The touch targets are visually large enough for the intended 44px minimum.

Repair notes resolved during implementation:

1. The generated mobile image includes a bottom navigation item named `Avaliacoes`. It was not copied; the approved collaborator navigation remains unchanged.
2. The mobile summary shows four metrics in one band. The real implementation was validated at `390x844` and `375x812`; the band wraps vertically without horizontal overflow.
3. Responsive QA confirmed no horizontal overflow at `390x844` or `375x812`.

## 5. Documentation gaps found by the image audit

The references reveal details that were not yet explicit in the source documentation:

### 5.1 Navigation contract

The generated image uses generic labels such as `Jornada`, `Saude`, `Conteudos`, and `Agenda`. The approved code navigation uses the collaborator groups `Minha jornada` and `Evolucao`, with `Hoje`, `Meu semaforo`, `Minha agenda`, `Campanhas`, `Objetivos`, `Desafios`, `Conquistas`, and `Liga semanal`.

Implementation must preserve the existing navigation contract. The new NR-1 entry belongs in the collaborator home journey, not automatically in the sidebar or a new mobile bottom navigation.

### 5.2 Summary data contract

The image shows `Check-ins esta semana`, `Jornada iniciada`, `Conteudos vistos`, and `Conquistas`. The current `CollaboratorHome` type does not provide all of these values. Existing fields include content, campaigns, exams, streak, points, and achievements, but there is no confirmed `journeyStartedAt` or weekly check-in aggregate.

The implementation must either:

- map only to existing, verified fields; or
- add an explicit typed data contract and tests before displaying a new metric.

No hard-coded or invented health metric is allowed in the dashboard.

### 5.3 Lock state contract

The product needs explicit states before the card is wired:

- `preview_available`: collaborator can open the mock preview;
- `contract_required`: the feature exists but access requires the company entitlement;
- `unavailable`: the integration is not ready and the action is disabled with an explanatory message;
- `real_integration`: only after Yavix auth, results/scoring, legal, and tenant gates pass.

The lock icon and badge must be driven by this state, not by visual decoration alone.

### 5.4 Generated image usage

The images are art-direction references only. They must not be shipped as rasterized UI or treated as a replacement for real React/CSS components. Exact labels, icons, focus states, loading states, permission states, and error recovery must be implemented from the shared design system.

## 6. Acceptance criteria for the implementation

- Entry is visible only in the collaborator experience and only when the preview entitlement is enabled.
- Lock icon is adjacent to `Avaliacao NR-1` and has an accessible label explaining controlled access.
- The collaborator can open `/avaliacao-nr1` from the journey item.
- The preview carries an explicit non-compliance disclaimer before and after the flow.
- No CPF, token, answers, or sensitive response content is logged or exposed in the home panel.
- The mock is fail-closed outside an explicit preview/staging environment.
- Existing collaborator navigation remains intact.
- Desktop and mobile screenshots are captured from the real implementation at representative dimensions.
- Keyboard focus, reduced motion, contrast, loading, error, unavailable, and completed states pass independent review.
- The feature is not promoted as real NR-1 integration until the Yavix blockers documented in `INTEGRACAO_YAVIX_NR1.md` are resolved.

## 7. Decision

**Visual direction:** approved.

**Image audit:** desktop PASS; mobile PASS WITH REPAIR NOTES.

**Implementation location:** dedicated collaborator Wave 3 worktree branched from the validated Editorial Operational foundation.

**Current status:** implementation complete in the dedicated worktree; documentation updated and commit prepared.

## 8. Implementation and validation record

### 8.1 Implemented surface

The implementation is located in:

`C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`

Implemented changes:

- Added the ordered `Minha jornada` composition to the collaborator home.
- Added `Avaliacao NR-1` with the lock immediately beside the title, `Acesso controlado`, `Abrir previa`, and the non-compliance disclaimer.
- Kept the entry out of the sidebar and out of any invented mobile bottom navigation.
- Added the typed preview state helper in `src/lib/nr1/preview-state.ts` with `preview_available`, `contract_required`, `unavailable`, and `real_integration` states.
- Kept the real integration disabled until Yavix authentication, scoring/results, legal, and tenant gates are closed.
- Integrated the COPSOQ scaffold and fixed its gamification service dependency imports for the current foundation branch.
- Added unit coverage for all preview states.
- Removed the duplicate mobile check-in action discovered during screenshot audit; desktop and mobile now expose one visible action per breakpoint.

### 8.2 Runtime gates

The preview requires the explicit build-time flag `NEXT_PUBLIC_UNIHER_NR1_PREVIEW=1`. Entitlement is controlled by `NEXT_PUBLIC_UNIHER_NR1_ENTITLEMENT`; setting it to `0` disables the action. The current implementation keeps `realIntegration` false, so this is still a controlled scaffold preview and not an NR-1 compliance product.

### 8.3 Evidence and checks

- Unit suite: `29` test files and `278` tests passed.
- Production build: passed with the existing Turbopack NFT tracing warning in `next.config.ts` / `src/app/api/admin/system/ops/route.ts`.
- Authenticated browser smoke: collaborator login, `/colaboradora`, and `/avaliacao-nr1` reached the consent screen.
- Desktop screenshot: `1440x900`, visual pass.
- Mobile screenshot: `390x844`, visual pass after the duplicate-action repair.
- Responsive check: `375x812`, no horizontal overflow (`bodyWidth=375`, `htmlWidth=375`).
- Evidence files:
  - `C:\Users\user\.codex\visualizations\2026\07\17\019f71d7-ec52-77a0-881e-14421bd0b15e\uniher-nr1-desktop-applied-fixed.png`
  - `C:\Users\user\.codex\visualizations\2026\07\17\019f71d7-ec52-77a0-881e-14421bd0b15e\uniher-nr1-mobile-journey-fixed.png`

### 8.4 Remaining gate

The feature is ready as a controlled front-end preview. It must not be promoted to real NR-1 integration until the blockers in `INTEGRACAO_YAVIX_NR1.md` are resolved and independently reviewed.
