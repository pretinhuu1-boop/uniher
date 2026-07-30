# UniHER authenticated no-spec recovery goal

Date: 2026-07-30

## Goal

Continue the authenticated UniHER recovery until screens do not show specs, placeholders or static shells when a real recoverable product surface already exists. Replace each recoverable spec with the smallest safe implementation, or keep it hidden/HOLD when contract, source, privacy or governance is missing.

## Anti-regression rules

- Public landing remains unchanged. Every wave checks the landing denylist before edits and before commit.
- Sensitive products remain fail-closed: NR-1/Yavix real, Liga/ranking/rewards, Concierge operations, Canal de Denuncias intake, SIPAT operations and Desenvolvimento Humano trails.
- Existing real products are reused before rebuilding: community editorial, lessons, campaigns, collaborator objectives, challenges, achievements, agenda and notifications.
- RED/GREEN is required for each promoted surface: add a focused regression canary that fails on the current spec/shell, then implement the smallest safe UI/API bridge.
- Visual evidence is required for UI waves on desktop and mobile before deployment claims.
- Commit/push only explicit wave files after diff review. Deploy only after local gates pass.

## Completed wave target

`/produtos-modulos` is recoverable now. It currently renders a static `ContainedSurfacePreview`, but `/api/company/modules` and the `company_modules` store already exist. The safe implementation is a real company module status surface:

- all users with company scope can read module states;
- only Master Admin can change non-sensitive module states;
- sensitive modules display HOLD and cannot be enabled from this UI;
- no landing, public route, NR-1 runtime, Liga, rewards, Denuncias intake, Concierge case workflow, SIPAT content or DH trail behavior is introduced.

## Current wave target

`/historico` and `/desafios/gerenciar` were authenticated spec/review routes with no safe standalone product contract. The safe implementation is compatibility routing:

- `/historico` sends RH/Admin/Lideranca to `/dashboard?section=exames` and colaboradora to `/colaboradora`;
- `/desafios/gerenciar` sends RH/Admin to `/gamificacao-config` and colaboradora to `/desafios`;
- unauthenticated users keep the auth redirect with the original target;
- no history API productization, challenge-admin workflow, ranking, rewards or Liga behavior is introduced.

## Current navigation containment wave

Authenticated navigation must not lead users into shell/spec pages that have no approved contract. The safe implementation is:

- remove the fixed Admin `/concierge` shortcut;
- hide runtime-unready module-shell routes from module-aware navigation: Concierge, NR-1, SIPAT, Desenvolvimento Humano and Canal de Denuncias;
- require both `module_state=enabled` and an explicit runtime-ready navigation flag before a module-only route can appear in the sidebar;
- keep `/produtos-modulos` as the visible governance/status surface for those modules;
- keep direct URLs fail-closed for audit and deep-link containment, without promoting the module as usable product.

## Current Liga compatibility wave

`/liga` and `/liga/gerenciar` were privacy-review/spec screens for a product that still has no approved ranking/reward contract. The safe implementation is compatibility routing only:

- `/liga` sends colaboradora users to `/conquistas`, RH/Admin to `/gamificacao-config`, and lideranca to `/campanhas`;
- `/liga/gerenciar` sends RH/Admin to `/gamificacao-config`, colaboradora to `/conquistas`, and lideranca to `/campanhas`;
- unauthenticated users keep auth redirects with the original targets;
- no Liga product, leaderboard, rewards, points, XP, scoring, group comparison or redemption behavior is introduced.

## Current collaborator private journey copy wave

The collaborator home and manager sidebar still surfaced legacy review/spec copy around gamification. The safe implementation is copy and link cleanup only:

- collaborator home replaces `Pontuação e classificação em revisão` with a `Jornada privada` card linking to `/objetivos`, `/desafios` and `/conquistas`;
- manager sidebar replaces `Conquistas em revisão` with `Conquistas privadas`;
- no scoring, ranking, points, XP, rewards, league, badges or comparative behavior is introduced.

## Current collaborator campaign recovery wave

The collaborator home had a recoverable company campaigns affordance in the previous product and should not degrade to only an abstract summary number. The safe implementation is a read-only campaign card on `/colaboradora`:

- show the current company campaign count from the existing collaborator home payload;
- link to the existing `/campanhas` product surface;
- keep the card free of XP, ranking, points, rewards, league, badges or comparison copy;
- do not introduce a new campaign API, join flow or management behavior from this wave.

## Current module direct-shell hiding wave

Direct module URLs for products without approved runtime contracts were still showing contained spec/HOLD shells. The safe implementation is compatibility routing only:

- `/concierge`, `/canal-denuncias`, `/viva-sipat` and `/desenvolvimento-humano` send Admin users to `/admin?tab=empresas`;
- `/nr1` sends RH users to `/produtos-modulos` and colaboradoras to `/colaboradora`;
- unauthenticated users keep auth redirects with the original targets;
- no Concierge case workflow, Denuncias intake, SIPAT operation, Desenvolvimento Humano trail or NR-1/Yavix runtime behavior is introduced.

## Current NR-1 technical preview hiding wave

`/avaliacao-nr1` still had a renderable technical preview/unavailable screen when a company was entitled but the Yavix mock/runtime was not active. The safe implementation is fail-closed routing:

- unauthenticated users keep the auth redirect with the original target;
- users without explicit NR-1 runtime entitlement continue to `/nr1`, which is already compatibility-routed by role;
- users with entitlement but without the explicit Yavix mock runtime also return to `/nr1`;
- collaborator home hides the NR-1 journey row unless the controlled preview is actually available;
- only explicitly mocked dev/test runtime can render `CopsoqFlow`;
- no production COPSOQ, Yavix integration, laudo, scoring, GRO/PGR or technical unavailable shell is introduced.

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

PASS requires focused unit tests, typecheck, `git diff --check`, denylist check, desktop/mobile authenticated screenshots for promoted/compatibility surfaces, explicit commit, push, deploy, and production health/smoke. If any non-technical gate is missing, the release state remains HOLD for that surface.
