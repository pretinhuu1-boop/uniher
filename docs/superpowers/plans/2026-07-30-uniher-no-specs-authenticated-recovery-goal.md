# UniHER authenticated no-spec recovery goal

Date: 2026-07-30

## Goal

Continue the authenticated UniHER recovery until screens do not show specs, placeholders or static shells when a real recoverable product surface already exists. Replace each recoverable spec with the smallest safe implementation, or keep it hidden/HOLD when contract, source, privacy or governance is missing.

## Anti-regression rules

- Public landing remains unchanged. Every wave checks the landing denylist before edits and before commit.
- Public landing path denylist: `src/app/page.tsx`, `src/components/landing`, `src/app/(public)`, `public`.
- Landing guard is required before edit, before commit, before push and before deploy: `landing_worktree_diff_count=0`.
- Sensitive products remain fail-closed: NR-1/Yavix real, Liga/ranking/rewards, Concierge operations, Canal de Denuncias intake, SIPAT operations and Desenvolvimento Humano trails.
- Existing real products are reused before rebuilding: community editorial, lessons, campaigns, collaborator objectives, challenges, achievements, agenda and notifications.
- RED/GREEN is required for each promoted surface: add a focused regression canary that fails on the current spec/shell, then implement the smallest safe UI/API bridge.
- Visual evidence is required for UI waves on desktop and mobile before deployment claims.
- Commit/push only explicit wave files after diff review. Deploy only after local gates pass.
- No wave can pass only by fixing the route it touched. The current authenticated route matrix must stay explicit enough to prove that no reachable authenticated screen is still rendering specs in place of recoverable product.

## Active Wave

Run a rendered authenticated route sweep from the no-spec matrix to select the next product edit wave.

Matrix artifact:

- `docs/superpowers/audits/2026-07-30-uniher-authenticated-no-spec-matrix.md`

Current completed implementation target:

- `/gamificacao-config` copy hardening.
- Decision: `PASS_REAL_PRODUCT` after local RED/GREEN, visual evidence, production deploy and production render smoke.
- Receipt: `docs/superpowers/audits/2026-07-30-uniher-gamificacao-config-copy-wave.md`.
- Production commit: `8efcdc3`.

Current active implementation target:

- admin sidebar copy hardening selected by rendered production sweep on commit `af74ecc`;
- decision: `COPY_FIX` because `/gamificacao-config` is real product but admin sidebar still rendered internal governance wording;
- status: PASS after unit canary, typecheck, source scan, landing guard, local desktop/mobile Playwright evidence, VPS deploy and production desktop/mobile render smoke;
- receipt: `docs/superpowers/audits/2026-07-30-uniher-admin-sidebar-copy-wave.md`;
- keep the same denylist: public landing, permissions, APIs, database contracts, ranking/rewards/Liga behavior, NR-1/Yavix/COPSOQ, Concierge, Denuncias, SIPAT and Desenvolvimento Humano.
- follow-up rendered production sweep on commit `4031d32` is PASS: 75 role/routes, 75 PASS, 0 REVIEW, 0 ERROR.
- flow-only visual gap wave is PASS: `/onboarding-rh` and `/primeiro-acesso` were added to `VISUAL_SMOKE_ROUTES`, local visual matrix is 204 PASS / 0 FAIL, and focused production desktop/mobile evidence is 4 PASS / 0 REVIEW / 0 ERROR.
- completion audit is PASS for the current route inventory and production evidence: `docs/superpowers/audits/2026-07-30-uniher-no-specs-authenticated-completion-audit.md`.

Required matrix columns for ongoing maintenance:

| Column | Meaning |
| --- | --- |
| Route | Authenticated route or compatibility URL. |
| Role | `admin`, `rh`, `lideranca`, `colaboradora` or `all authenticated`. |
| Current decision | `PROMOTE`, `COPY_FIX`, `COMPAT_REDIRECT`, `HOLD_HIDDEN`, `PASS_REAL_PRODUCT`. |
| Recoverable product source | Existing page/API/module/previous implementation to reuse, or `none`. |
| Forbidden rendered terms | Terms that must not appear for that route/role. |
| Contract/governance status | `approved`, `safe existing`, `missing`, `sensitive hold`, or `source gated`. |
| Visual gate | Desktop/mobile viewport screenshots, plus viewport/DOM geometry when fixed navigation is involved. |
| Verification command/evidence | Focused test, scan, screenshot path and deployment receipt. |

The next implementation wave must be selected from this matrix. If a route has no approved product source, the only safe decisions are `COMPAT_REDIRECT` or `HOLD_HIDDEN`.

## Wave Ledger

| Surface | Decision | Status |
| --- | --- | --- |
| `/produtos-modulos` | Real module status/limited governance UI | Done |
| `/historico` | Compatibility redirect | Done |
| `/desafios/gerenciar` | Compatibility redirect | Done |
| Authenticated navigation shell links | Hide runtime-unready sensitive modules | Done |
| `/liga`, `/liga/gerenciar` | Compatibility redirects | Done |
| `/colaboradora` gamification review banner | Private journey links to existing surfaces | Done |
| `/colaboradora` campaign summary | Read-only company campaigns card | Done |
| `/concierge`, `/canal-denuncias`, `/viva-sipat`, `/desenvolvimento-humano`, `/nr1` | Direct-shell compatibility routing/fail-closed | Done |
| `/avaliacao-nr1` | Fail-closed unless explicit mock runtime is active | Done |
| `/objetivos`, `/desafios`, `/conquistas`, navigation copy | Internal contract/governance wording removed from real product surfaces | Done |
| Global authenticated no-spec matrix | Required before the next product edit | Done |
| `/gamificacao-config` copy hardening | Remove internal governance/spec vocabulary from a real RH/Admin surface | Done |
| Rendered authenticated route sweep | Selected admin sidebar copy leak from production commit `af74ecc` | Done |
| Admin sidebar `/gamificacao-config` presentation details | Remove `Governanca privada` from rendered admin sidebar | Done |
| Rendered authenticated route sweep after admin sidebar fix | Confirm no visible review hit remains in the current 75-route matrix | Done |
| Flow-only visual gap coverage | Add `/onboarding-rh` and `/primeiro-acesso` to visual coverage with production screenshots | Done |
| Authenticated no-spec completion audit | Verify current route inventory, matrix, production sweeps, visual gates and governance holds | Done |
| Concierge operations | Operational contract, SLA, data governance | HOLD |
| Canal de Denuncias intake | Partner/legal/DPO workflow | HOLD |
| SIPAT operations | Approved source package | HOLD |
| Desenvolvimento Humano trails | Approved content/trail contract | HOLD |
| Real NR-1/Yavix/COPSOQ | Contract/runtime/intake/scoring/legal gates | HOLD |
| Liga/ranking/rewards | Privacy product policy and reward governance | HOLD |

## Completed Produtos e Modulos Recovery

`/produtos-modulos` is recoverable now. It currently renders a static `ContainedSurfacePreview`, but `/api/company/modules` and the `company_modules` store already exist. The safe implementation is a real company module status surface:

- all users with company scope can read module states;
- only Master Admin can change non-sensitive module states;
- sensitive modules display HOLD and cannot be enabled from this UI;
- no landing, public route, NR-1 runtime, Liga, rewards, Denuncias intake, Concierge case workflow, SIPAT content or DH trail behavior is introduced.

## Completed Compatibility Routing: Historico And Challenge Management

`/historico` and `/desafios/gerenciar` were authenticated spec/review routes with no safe standalone product contract. The safe implementation is compatibility routing:

- `/historico` sends RH/Admin/Lideranca to `/dashboard?section=exames` and colaboradora to `/colaboradora`;
- `/desafios/gerenciar` sends RH/Admin to `/gamificacao-config` and colaboradora to `/desafios`;
- unauthenticated users keep the auth redirect with the original target;
- no history API productization, challenge-admin workflow, ranking, rewards or Liga behavior is introduced.

## Completed Navigation Containment

Authenticated navigation must not lead users into shell/spec pages that have no approved contract. The safe implementation is:

- remove the fixed Admin `/concierge` shortcut;
- hide runtime-unready module-shell routes from module-aware navigation: Concierge, NR-1, SIPAT, Desenvolvimento Humano and Canal de Denuncias;
- require both `module_state=enabled` and an explicit runtime-ready navigation flag before a module-only route can appear in the sidebar;
- keep `/produtos-modulos` as the visible governance/status surface for those modules;
- keep direct URLs fail-closed for audit and deep-link containment, without promoting the module as usable product.

## Completed Liga Compatibility

`/liga` and `/liga/gerenciar` were privacy-review/spec screens for a product that still has no approved ranking/reward contract. The safe implementation is compatibility routing only:

- `/liga` sends colaboradora users to `/conquistas`, RH/Admin to `/gamificacao-config`, and lideranca to `/campanhas`;
- `/liga/gerenciar` sends RH/Admin to `/gamificacao-config`, colaboradora to `/conquistas`, and lideranca to `/campanhas`;
- unauthenticated users keep auth redirects with the original targets;
- no Liga product, leaderboard, rewards, points, XP, scoring, group comparison or redemption behavior is introduced.

## Completed Collaborator Private Journey Copy

The collaborator home and manager sidebar still surfaced legacy review/spec copy around gamification. The safe implementation is copy and link cleanup only:

- collaborator home replaces `Pontuação e classificação em revisão` with a `Jornada privada` card linking to `/objetivos`, `/desafios` and `/conquistas`;
- manager sidebar replaces `Conquistas em revisão` with `Conquistas privadas`;
- no scoring, ranking, points, XP, rewards, league, badges or comparative behavior is introduced.

## Completed Collaborator Campaign Recovery

The collaborator home had a recoverable company campaigns affordance in the previous product and should not degrade to only an abstract summary number. The safe implementation is a read-only campaign card on `/colaboradora`:

- show the current company campaign count from the existing collaborator home payload;
- link to the existing `/campanhas` product surface;
- keep the card free of XP, ranking, points, rewards, league, badges or comparison copy;
- do not introduce a new campaign API, join flow or management behavior from this wave.

## Completed Module Direct-Shell Hiding

Direct module URLs for products without approved runtime contracts were still showing contained spec/HOLD shells. The safe implementation is compatibility routing only:

- `/concierge`, `/canal-denuncias`, `/viva-sipat` and `/desenvolvimento-humano` send Admin users to `/admin?tab=empresas`;
- `/nr1` sends RH users to `/produtos-modulos` and colaboradoras to `/colaboradora`;
- unauthenticated users keep auth redirects with the original targets;
- no Concierge case workflow, Denuncias intake, SIPAT operation, Desenvolvimento Humano trail or NR-1/Yavix runtime behavior is introduced.

## Completed NR-1 Technical Preview Hiding

`/avaliacao-nr1` still had a renderable technical preview/unavailable screen when a company was entitled but the Yavix mock/runtime was not active. The safe implementation is fail-closed routing:

- unauthenticated users keep the auth redirect with the original target;
- users without explicit NR-1 runtime entitlement continue to `/nr1`, which is already compatibility-routed by role;
- users with entitlement but without the explicit Yavix mock runtime also return to `/nr1`;
- collaborator home hides the NR-1 journey row unless the controlled preview is actually available;
- only explicitly mocked dev/test runtime can render `CopsoqFlow`;
- no production COPSOQ, Yavix integration, laudo, scoring, GRO/PGR or technical unavailable shell is introduced.

## Completed Produtos e Modulos Copy Hardening

`/produtos-modulos` is already the real company module status surface, but the authenticated UI still exposed internal implementation/governance jargon. The safe implementation is copy hardening only:

- user-facing copy says `Bloqueado por contrato` / `Requer contrato` instead of `HOLD`;
- user-facing copy says contract, technical audit, operational execution, automatic evaluation and sensitive data receipt instead of `company_modules`, backend, runtime, scoring or intake;
- the governance decision in this plan remains HOLD for sensitive modules, but the product UI avoids internal jargon;
- no sensitive module activation, permission change, API behavior, landing change or new runtime is introduced.

## Remaining authenticated spec inventory

| Surface | Decision |
| --- | --- |
| `/produtos-modulos` | Promoted: real module status/limited governance UI |
| `/concierge` | Compatibility redirect; operational contract, SLA and data boundaries remain HOLD |
| `/canal-denuncias` | Compatibility redirect; partner/legal/DPO decision before intake remains HOLD |
| `/viva-sipat` | Compatibility redirect; approved source package remains HOLD |
| `/desenvolvimento-humano` | Compatibility redirect; approved content/trail contract remains HOLD |
| `/nr1` | Compatibility redirect; real Yavix/COPSOQ contract intake remains HOLD |
| `/avaliacao-nr1` | Compatibility redirect unless explicit mock runtime is active; production NR-1/Yavix remains HOLD |
| `/colaboradora` NR-1 preview card | Hidden unless controlled NR-1 preview is actually available |
| `/liga`, `/liga/gerenciar` | Compatibility redirects; Liga/ranking/rewards product remains HOLD_PRIVACY_PRODUCT |
| `/desafios/gerenciar` | Compatibility redirect; governed challenge admin remains HOLD |
| `/historico` | Compatibility redirect; dedicated history product remains HOLD_PRODUCTIZE_HISTORY |
| `/colaboradora` gamification review banner | Promoted: real private journey links to existing objetivos/desafios/conquistas surfaces |
| `/colaboradora` campaign summary only | Promoted: real company campaigns card linking to `/campanhas`, read-only from existing payload |

## Wave gate

PASS requires focused unit tests, typecheck, `git diff --check`, landing denylist check, desktop/mobile authenticated screenshots for promoted/compatibility surfaces, explicit commit, push, deploy, and production health/smoke. If any non-technical gate is missing, the release state remains HOLD for that surface.

## Visual regression guard

Mobile screenshots that use Playwright `fullPage: true` can show the fixed collaborator bottom navigation in the middle of the long capture. Full-page captures are auxiliary evidence and must be labeled as such. A mobile navigation overlap becomes a blocker when at least one viewport/DOM gate fails:

- the bottom navigation escapes the viewport;
- a bottom navigation item escapes or overlaps another item;
- the main/workspace bottom padding is lower than the rendered navigation height;
- a required heading, control or terminal content cannot be scrolled above the navigation in a normal viewport screenshot.

Required evidence for collaborator mobile UI waves:

- viewport screenshots at top, mid-scroll and bottom;
- optional full-page screenshot labeled as auxiliary;
- DOM geometry check proving final meaningful content or CTA can sit above `MobileBottomNav`;
- padding check proving main/workspace bottom padding is at least the rendered navigation height plus safe-area inset.

Current evidence on 2026-07-30: `cd tests; npx playwright test --config=playwright.config.ts --project=visual-ux --grep "sidebar top bottom and bottom nav geometry are guarded"` passed. Keep this gate in the anti-regression set before changing `AppLayout`, `MobileBottomNav` or collaborator mobile pages.

## Active next-wave loop

1. Scan rendered authenticated routes for visible `spec`, `placeholder`, `preview`, internal contract/governance jargon or recovered-product regressions.
2. For each finding, classify it as:
   - `PROMOTE`: real implementation already exists and can be safely wired or linked;
   - `COPY_FIX`: real product exists but the UI still exposes spec/internal language;
   - `COMPAT_REDIRECT`: no standalone product contract exists, but a consolidated safe surface exists;
   - `HOLD_HIDDEN`: sensitive or source-gated module with no approved contract/runtime.
3. Open only one small write set per wave and add/update a focused canary before the fix when behavior changes.
4. Run the gates, capture desktop/mobile evidence, commit explicit files, push, then deploy only a green commit.
5. Do not close this goal while any authenticated user can still reach a spec/shell instead of a recoverable product or an explicit fail-closed route.

Current production sweep evidence after the admin sidebar fix: `docs/superpowers/evidence/production-authenticated-route-sweep-4031d32-2026-07-30T10-30-11-409Z/summary.json`.
