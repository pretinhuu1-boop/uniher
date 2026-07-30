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

## Remaining authenticated spec inventory

| Surface | Decision |
| --- | --- |
| `/produtos-modulos` | Promoted: real module status/limited governance UI |
| `/concierge` | HOLD: needs operational contract, SLA, data boundaries |
| `/canal-denuncias` | HOLD: partner/legal/DPO decision before intake |
| `/viva-sipat` | HOLD: approved source package before content |
| `/desenvolvimento-humano` | HOLD: approved content/trail contract |
| `/nr1` | HOLD shell: real Yavix/COPSOQ requires separate contract intake |
| `/liga`, `/liga/gerenciar` | HOLD: privacy scoring/ranking contract missing |
| `/desafios/gerenciar` | Compatibility redirect; governed challenge admin remains HOLD |
| `/historico` | Compatibility redirect; dedicated history product remains HOLD_PRODUCTIZE_HISTORY |

## Wave gate

PASS requires focused unit tests, typecheck, `git diff --check`, denylist check, desktop/mobile authenticated screenshots for promoted/compatibility surfaces, explicit commit, push, deploy, and production health/smoke. If any non-technical gate is missing, the release state remains HOLD for that surface.
