# UniHER NR-1 Front Preview - Visual Audit and Implementation Target

**Status:** NR-1 preview remains controlled; the company-scoped Community feed and editorial management are **FUNCTIONAL** after API, tenant, privacy, unit, E2E, and cleanup gates. The collaborator feed has separate responsive evidence; editorial management was checked only at the default browser viewport. The five placeholder modules remain pending.

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
- The feature is not promoted as real NR-1 integration until the Yavix blockers documented in `docs/INTEGRACAO_YAVIX_NR1.md` are resolved.

## 7. Decision

**Visual direction:** approved.

**Image audit:** desktop PASS; mobile PASS WITH REPAIR NOTES.

**Implementation location:** dedicated collaborator Wave 3 worktree branched from the validated Editorial Operational foundation.

**Current status:** controlled NR-1 preview, conditional collaborator mobile shell, company-scoped Community feed, RH/admin editorial management, supporter consent, and private saved items are implemented in the dedicated worktree. Community is FUNCTIONAL under the evidence in section 9.5. The five placeholder routes remain a separate gated wave.

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
- Production build: passed with the known Turbopack NFT tracing warning in `next.config.ts` / `src/app/api/admin/system/ops/route.ts`.
- Final mobile-shell E2E: `2 passed` in `1 worker`; no horizontal overflow, real Journey focus navigation, Admin denied community state, and clean teardown of `1` test user and `1` test company.
- Authenticated browser smoke: collaborator login, `/colaboradora`, and `/avaliacao-nr1` reached the consent screen.
- Desktop screenshot: `1440x900`, visual pass.
- Mobile screenshot: `390x844`, visual pass after the duplicate-action repair.
- Responsive check: `375x812`, no horizontal overflow (`bodyWidth=375`, `htmlWidth=375`).
- Evidence files:
  - `C:\Users\user\.codex\visualizations\2026\07\17\019f71d7-ec52-77a0-881e-14421bd0b15e\uniher-nr1-desktop-applied-fixed.png`
  - `C:\Users\user\.codex\visualizations\2026\07\17\019f71d7-ec52-77a0-881e-14421bd0b15e\uniher-nr1-mobile-journey-fixed.png`

### 8.4 Remaining gate

The feature is ready as a controlled front-end preview. It must not be promoted to real NR-1 integration until the blockers in `docs/INTEGRACAO_YAVIX_NR1.md` are resolved and independently reviewed.

## 9. Individual mobile screens audit and next implementation map

The approved mobile direction was generated as four individual visual references. These files are outside the repository and are evidence for art direction only:

- Hoje: `C:\Users\user\.codex\generated_images\019f71d7-ec52-77a0-881e-14421bd0b15e\exec-b2337de1-f29b-49dc-943e-7484e3cc190a.png`
- Comunidade: `C:\Users\user\.codex\generated_images\019f71d7-ec52-77a0-881e-14421bd0b15e\exec-dc2c2a29-a31b-4f5e-b80c-a603986155e9.png`
- Jornada: `C:\Users\user\.codex\generated_images\019f71d7-ec52-77a0-881e-14421bd0b15e\exec-0e6c786f-f812-4bc7-b0d9-208ef564d8d0.png`
- Perfil: `C:\Users\user\.codex\generated_images\019f71d7-ec52-77a0-881e-14421bd0b15e\exec-39835128-d347-4e2e-8f8e-b5a6f4cc2e8b.png`

### 9.1 Visual audit result

The four screens are visually coherent with the approved Editorial Operational direction: porcelain canvas, espresso text, bronze action color, sage privacy/care accents, editorial headings, generous touch targets, and a four-destination mobile shell: `Hoje`, `Comunidade`, `Jornada`, `Perfil`.

Screen-specific findings:

- `Hoje`: PASS for the private check-in framing and the NR-1 lock, controlled-access badge, preview action, and disclaimer. The mood-face selector and some content-card behavior are new interactions that are not in the current typed contract.
- `Comunidade`: PASS for a curated feed, topic filters, `Apoiar`, `Salvar`, aggregate support count, and consent-based names. It must remain read-only/curated in the first wave: no open composer, comments, ranking, or public response content.
- `Jornada`: PASS for ordered steps, personal progress, controlled NR-1 access, and the no-ranking statement. The progress calculation and the first/next-step status are not currently supplied by the collaborator home API.
- `Perfil`: PASS for a privacy-first control center, saved items, notifications, content preferences, and the explicit statement that check-ins, semaforo, and NR-1 responses never enter the community feed. The `Mostrar meu nome ao apoiar` preference is a new consent contract.

### 9.2 Reference-only corrections

The generated images contain fictional or approximate assets. They must not be copied into production:

- The botanical marks, circular `UniHER editorial` badge, shield/leaf marks, and gold decorative logos are not canonical UniHER brand assets.
- The generated portraits, avatars, coffee/bedroom photos, and plant illustrations are art-direction placeholders, not approved product content.
- The generated icons are visual approximations; implementation must use the existing `lucide-react` and `SidebarNavItem` primitives where applicable.
- The exact UI copy must come from the approved product/spec contract, including the NR-1 disclaimer. Generated spelling or accent omissions are not a source of truth.

Use the existing real assets and components instead:

- Brand: `public/logo-uniher.png`, `public/logo.svg`, and the existing company-logo contract.
- Avatar: `src/components/ui/AvatarBadge.tsx` (`Avatar`) with a real user image or initials fallback.
- Shell icons and navigation primitives: `src/components/platform/SidebarNavItem.tsx` and existing `lucide-react` usage.
- Real content media: only after a typed content/media source is approved; do not ship the generated raster previews.

### 9.3 Current code reality and implementation locations

The correct implementation location remains the dedicated worktree:

`C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`

Current code map:

- `src/app/(platform)/colaboradora/page.tsx`: current `Hoje` entry point and the already implemented NR-1 journey row. Keep the controlled preview here; do not duplicate it in a new community route.
- `src/components/platform/AppLayout.tsx`: global authenticated shell. It renders `Sidebar`, `MobileTopbar`, and the collaborator-only `MobileBottomNav` at mobile widths; the bottom-nav `112px + safe-area` spacing is conditional on the collaborator workspace class.
- `src/components/platform/MobileTopbar.tsx`, `src/components/platform/MobileBottomNav.tsx`, and `src/components/platform/AppLayout.module.css`: runtime mobile header, bottom destinations, breakpoint behavior, focus states, safe-area padding, and overflow protection.
- `src/components/platform/navigation.ts`: existing role navigation contract. Any `Comunidade` or bottom-nav addition must be deliberate and role-scoped, not inferred from the image.
- `src/app/(platform)/configuracoes/page.tsx`: existing profile, notification, and privacy settings. Use this as the initial `Perfil` destination instead of creating a duplicate profile route.
- `src/app/(platform)/avaliacao-nr1/page.tsx`: controlled NR-1 preview route and current scaffold boundary.
- `src/app/(platform)/comunidade/page.tsx` and `src/components/community/*`: functional collaborator/dual-role feed with loading, denied, disabled, empty, error/retry, filtered list, cursor pagination, support, private save, and consent-based supporter states.
- `src/app/(platform)/comunidade/gerenciar/page.tsx`: functional RH/admin editorial workspace. RH/admin uses the authenticated company; Admin Master must select an active company explicitly before any read or write.
- `src/app/api/collaborator/feed/route.ts`, `/api/collaborator/saved`, and the support/save/supporters child routes: active company-scoped API contract with persisted membership/capability validation and private/no-store responses.
- `src/app/api/rh/community/posts` and `/api/rh/community/posts/[id]`: active editorial list/create/read/patch contract with terminal archive lifecycle, transactional audit receipts, and no hard delete.
- `src/app/(platform)/configuracoes/page.tsx`: functional default-off supporter-name consent and private saved-items profile surface. Check-ins, semaforo, and NR-1 answers remain outside Community.

### 9.4 Next implementation waves

The visual design is approved and the collaborator mobile shell is implemented. The next work must remain split into independently reviewable waves:

1. `Wave A - Mobile shell`: **PASS / IMPLEMENTADA**. `AppLayout` exposes a conditional responsive bottom-nav contract for collaborator sessions, preserves the drawer/sidebar fallback, and maps `Hoje`, `Comunidade`, `Jornada`, and `Perfil` to authenticated destinations.
2. `Wave B - Community read-only`: **FUNCTIONAL**. Typed company feed, topic filtering, `Apoiar`, private `Salvar`, aggregate counts, cursor pagination, and opt-in supporter names are implemented. Comments, composer, ranking, and public health responses remain out of scope.
3. `Wave C - Profile privacy`: **FUNCTIONAL**. `/configuracoes` exposes default-off supporter-name consent, immediate revocation, private saved items, session-isolated cache, and accessible authorization-loss recovery.
4. `Wave D - Placeholder repair`: resolve `/semaforo`, `/objetivos`, `/desafios`, `/conquistas`, and `/liga` in that order, only after each data/privacy contract is approved. The legacy gamification containment is not evidence of a completed module.
5. `NR-1 gate`: keep `/avaliacao-nr1` as a controlled preview until the Yavix and legal gates in `docs/INTEGRACAO_YAVIX_NR1.md` pass independent review.

### 9.5 Community functional gate

- Evidence SHAs are deliberately split by gate: visual regression ran on `f87c5fd`; the integrated E2E matrix ran twice on `4511eb2` and once on `908357f`; the complete unit/build gate ran on `006770f`. No later SHA is inferred for an earlier execution.
- Full unit suite on integral HEAD `006770f`: `npm run test:unit`: **PASS, 470/470** tests in **51** files. Commit `006770f` contains the collaborator-company docs/OpenAPI parity correction and its focused unit test, while the receipt applies to the complete suite at that HEAD.
- Production build on integral HEAD `006770f`: `npm run build`: **PASS**, with **137 routes/pages generated**. The only diagnostics were the two known, pre-existing NFT tracing warnings from `next.config.ts` while tracing `src/app/api/admin/system/ops/route.ts`; they did not fail the build.
- Visual regression gate on `f87c5fd`: `visual-ux`: **PASS, 21/21** in **two consecutive executions**.
- Integrated Wave 4 matrix on `4511eb2`, after the service-worker fix: `community-feed`, `community-feed-ui`, `mobile-shell`, `privacy-wave-1-1`, and `seguranca`: **PASS, 65/65 in two consecutive executions**, using **3 workers** and **zero retries**.
- Post-guard confirmation on `908357f`: mobile-shell **PASS, 2/2**, followed by one complete integrated matrix **PASS, 65/65**, using **3 workers** and **zero retries** after the external fixture-host guard.
- The matrix retains real backend coverage for auth, tenant isolation, disabled default-off behavior, idempotent support/save, consent and revocation, editorial lifecycle, switch/audit receipts, persisted actor changes, explicit master company selection, cleanup, and security/privacy containment. Deterministic UI cases remain visual evidence, not substitutes for backend integration.
- Current screenshot receipts: `tests/results/community-feed-ui-Collabor-f1792-verflow-or-identity-leakage-community-feed-ui/community-feed-375x812.png`, `tests/results/community-feed-ui-Collabor-54d55-verflow-or-identity-leakage-community-feed-ui/community-feed-390x844.png`, `tests/results/community-feed-ui-Collabor-a90d1-verflow-or-identity-leakage-community-feed-ui/community-feed-768x900.png`, and `tests/results/community-feed-ui-Collabor-d1d39-verflow-or-identity-leakage-community-feed-ui/community-feed-1440x1000.png`.
- Current mobile-shell receipt: `tests/results/mobile-collaborator-shell--2b1fe-eserves-the-mobile-viewport-mobile-shell/mobile-collaborator-shell.png`.
- Editorial management browser workflow remains evidenced only at the configured default viewport. No multi-viewport or responsive-management claim is made by this audit.
- Quality findings are closed by `ab419f3`, `8305edd`, `f0af53c`, `f87c5fd`, `4b3fcfc`, `4511eb2`, `908357f`, and `006770f`. In particular, `908357f` closes the mobile fixture-host guard and `006770f` closes the collaborator-company documentation/OpenAPI parity finding.
- Evidence boundary: runtime evidence consists of visual verification on `f87c5fd`, two matrix passes on `4511eb2`, one mobile plus matrix confirmation on `908357f`, and the latest integral unit/build verification on `006770f`. The following documentation commit is a docs-only receipt and is not represented as a runtime-tested HEAD; only documentation link/path validation and `git diff --check` are performed after this edit.
- Contract source: [2026-07-20-uniher-company-community-feed.md](../plans/2026-07-20-uniher-company-community-feed.md).
- The five placeholder screens (`/semaforo`, `/objetivos`, `/desafios`, `/conquistas`, `/liga`) remain pending according to the master plan. Community becoming functional does not promote those modules.

**Decision:** Community moves from containment to **FUNCTIONAL** only on the evidence above. The four approved images remain visual direction, not runtime assets or proof by themselves. Canonical UniHER branding, real company/user assets, approved content media, existing icons, and implemented accessibility states always prevail over generated logos, portraits, illustrations, approximate copy, or decorative placeholders.
