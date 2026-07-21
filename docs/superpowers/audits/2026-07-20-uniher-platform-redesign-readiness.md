# UniHER Platform Redesign Readiness Audit

**Date:** 2026-07-20

**Worktree audited:** `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`

**Base:** Wave 1 Editorial Operational foundation plus the Wave 3 controlled NR-1 preview and mobile-shell final verification.

## Decision

The shared redesign foundation and collaborator mobile shell are ready for incremental implementation. The complete platform redesign is not complete. The community route remains a contained adapter; the real company-scoped feed and the five placeholder screens are separate future waves.

## Scorecard

| Area | Status | Verified evidence | Boundary |
|---|---|---|---|
| Visual tokens | PASS | `src/app/platform-theme.css` defines shell, canvas, action, positive, critical, typography-adjacent motion, radius, and z-index tokens | The token layer is present; route-by-route visual adoption is incomplete |
| Authenticated shell | PASS | `AppLayout`, `Sidebar`, `MobileTopbar`, focus handling, responsive drawer, `ScrollToTop`, auth loading | Desktop and tablet retain the drawer/sidebar contract; collaborator mobile adds the four-destination shell |
| Shared primitives | PASS | `PageHeader`, `SummaryBand`, `Button`, `FeedbackState`, `Avatar`, `Skeleton`, modal/drawer patterns | Some legacy routes still use local styling and older palette aliases |
| RH dashboard | PASS WITH FOLLOW-UP | `/dashboard` uses `PageHeader`, protected `SummaryBand`, loading/error states, filters, export action, and protected view model | Other RH/company routes remain mixed legacy/custom surfaces |
| Collaborator home | PASS FOR CURRENT WAVE | `/colaboradora` uses the shared header/band/patterns and exposes the controlled NR-1 journey row | It is not the new social/mobile home from the images |
| NR-1 preview | PASS AS CONTROLLED SCAFFOLD | `/avaliacao-nr1`, preview state helper, COPSOQ mock flow, consent/gate tests, disclaimer | Yavix/legal/tenant gates still block real integration |
| Collaborator secondary routes | BLOCKED/PARTIAL | `/semaforo`, `/objetivos`, `/desafios`, `/conquistas`, `/liga` currently resolve to review/feedback states; `/agenda` and related routes remain mixed | No redesign promotion should count these as completed experiences |
| Community route | PARTIAL / CONTAINMENT ADAPTER | `CommunityPage` is a client boundary with `loading`, `denied`, and collaborator-only `empty` states | The real company-scoped feed remains pending; `GET /api/collaborator/feed` is still a privacy-containment response |
| Community data layer | NOT STARTED | `useCollaboratorFeed` exists as a client hook, but no post/reaction/save repository or API contract exists | The company-scoped plan must create the domain and tests before UI |
| Profile destination | PARTIAL | `/configuracoes` already owns profile, notification, and privacy preferences | Generated `Perfil` screen is not implemented; map to existing settings first |
| Mobile bottom navigation | PASS WITH FOLLOW-UP / IMPLEMENTADA | `MobileBottomNav`, corrected `Navegação mobile` label, conditional `AppLayout` workspace class/padding, responsive CSS, and `mobile-collaborator-shell.spec.ts` | Only collaborator sessions, including dual-role collaborators, receive the nav; the community destination is intentionally disabled until its company-scoped feed contract is implemented |
| Brand assets | PASS FOR CODE BASE | `public/logo-uniher.png`, `public/logo.svg`, company logo contract, and canonical `Avatar` exist | Generated logos, portraits, and photos remain reference-only |
| Verification | PASS WITH KNOWN WARNING | `npm run test:unit`: 29 files / 278 tests; `npm run build`: pass; mobile-shell E2E: 2 passed in 1 worker | Build retains the known Turbopack NFT tracing warning from `next.config.ts` / admin ops route |

## Route coverage observed

The audited platform route group contains the expected authenticated routes, but their implementation maturity is mixed:

- Shared-pattern surfaces: `/dashboard`, `/colaboradora`, `/analytics-emails`, `/historico` and parts of related pages.
- Functional custom/legacy surfaces: `/admin`, `/campanhas`, `/colaboradoras-gestao`, `/company-profile`, `/configuracoes`, `/convites`, `/departamentos`, `/onboarding-rh`, `/primeiro-acesso`.
- Review or placeholder surfaces: `/semaforo`, `/objetivos`, `/desafios`, `/conquistas`, `/liga`, `/gamificacao-config`, with some adjacent routes exposing only neutral feedback states.
- Controlled new surface: `/avaliacao-nr1`.

This is why the visual direction can be approved while the redesign program remains incomplete.

## What is safe to start next

The next implementation wave can start from the current Wave 3 worktree and should follow the approved company-feed plan:

1. Establish the company-scoped data contract, migration, authorization policy, and cross-tenant tests.
2. Replace the contained feed response only after the contract is tested.
3. Build the collaborator `/comunidade` route using real UniHER/company assets and existing platform primitives.
4. Add RH/admin publishing only with company-scoped CRUD, audit logging, and an explicit feed switch.
5. Keep the five placeholder screens in their own gated repair wave; do not infer completion from the mobile shell.

## Do not count as ready

- The four generated mobile images are not implemented screens.
- The existing feed hook is not a working backend.
- The NR-1 preview is not a real compliance integration.
- Legacy gamification endpoints returning a neutral privacy state are not completed product modules.
- A passing build does not establish visual approval for routes without current desktop/mobile screenshots.

## Evidence and residual risk

- Fresh verification in this audit: unit suite, production build, and serial mobile-shell E2E passed.
- Existing NR-1 desktop/mobile evidence is recorded in `docs/superpowers/specs/2026-07-20-uniher-nr1-front-visual-audit.md`.
- The mobile-shell E2E confirmed no horizontal overflow, real Journey focus navigation, Admin community denial, and clean test-user/company teardown at `375x812`.
- The build warning is known Turbopack NFT tracing from `next.config.ts` / the admin ops route; it did not fail the build.
- The feature worktree contains the preceding audit/plan documentation plus the mobile-shell implementation. The real community feed and five placeholder screens remain outside this completed wave.

## Task 5 final verification

- `npm run test:unit`: PASS, 29 files / 278 tests.
- `npm run build`: PASS, with the known Turbopack NFT tracing warning.
- `cd tests; npx playwright test --project=mobile-shell --config=playwright.config.ts`: PASS, 2 tests in 1 worker; no horizontal overflow, real Journey focus, Admin denied state, and clean teardown of 1 test user and 1 test company.
- `git diff --check`: PASS.
- Findings P1/P2/P3: CORRECTED. The mobile bottom-nav spacing is conditional in `AppLayout`, fixture uniqueness uses `randomUUID`, and the shared mobile-shell describe is serial.
- Scope boundary: the five placeholder screens and the real company-scoped feed remain outside this round.

## Placeholder repair queue

The following routes are still partial and must be handled as a separate product wave. They must not be made to look complete with invented metrics or by reconnecting quarantined gamification endpoints:

| Priority | Route | Current state | Next gate |
|---|---|---|---|
| 1 | `/semaforo` | Neutral review state; legacy health-derived data is contained | Define the collaborator-safe personal status contract, copy, consent, and data source before UI implementation |
| 2 | `/objetivos` | Placeholder | Define personal objective lifecycle, ownership, progress source, and empty/loading/error states; no points or ranking by default |
| 3 | `/desafios` | Placeholder | Define company-curated challenge content and completion semantics; keep health responses private |
| 4 | `/conquistas` | Placeholder | Define a non-sensitive achievement ledger and privacy boundary before exposing history or badges |
| 5 | `/liga` | Placeholder | Remains blocked until eligibility, cohort, ranking, anti-exposure, and consent rules are approved; do not ship a ranking facade |

The execution order is intentional: semaforo establishes the personal-status boundary, objectives and challenges establish safe activity primitives, conquistas can consume a reviewed ledger, and liga is last because it has the highest privacy and policy risk.
