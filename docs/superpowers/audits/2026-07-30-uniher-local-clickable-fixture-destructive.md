# UniHER local clickable fixture destructive/account-state lane

Date: 2026-07-30

## Decision

PASS for the first destructive/account-state RH/Admin clickable lane.

This validates destructive or account-state buttons against disposable local fixture records only. It does not validate production data, import/export side effects, revocation flows or editorial/gamification content mutation flows.

## Scope

- Source map: `docs/superpowers/evidence/blocked-clickable-local-fixture-map-ea64600-2026-07-30/blocked-controls.json`.
- Test: `tests/e2e/clickable-destructive-fixture.spec.ts`.
- Project: `clickable-destructive-fixture` in `tests/playwright.config.ts`.
- Evidence: `docs/superpowers/evidence/local-clickable-fixture-destructive-8647cbf-2026-07-30/summary.json`.
- Runtime: local Playwright-owned DB/server only.
- Production: not used for this lane.

## Result

Command:

`cd tests; npx playwright test --config=playwright.config.ts --project=clickable-destructive-fixture`

Result: 3 passed.

Evidence summary:

- Total controls in lane: 7.
- PASS: 7.
- REVIEW: 0.
- FAIL: 0.
- Company state: 2 PASS / 0 REVIEW / 0 FAIL.
- User state: 3 PASS / 0 REVIEW / 0 FAIL.
- Department delete: 2 PASS / 0 REVIEW / 0 FAIL.

## Validated Controls

- Admin `/admin?tab=empresas`: `Suspender` changed only the fixture company `is_active` to `0`.
- Admin `/admin?tab=empresas`: `Reativar` changed only the fixture company `is_active` back to `1`.
- Admin `/admin?tab=usuarios`: `Bloquear` changed only the fixture user `blocked` to `1`.
- Admin `/admin?tab=usuarios`: `Desbloquear` changed only the fixture user `blocked` back to `0`.
- Admin `/admin?tab=usuarios`: `Resetar Senha` returned the out-of-band password reset contract without exposing a temporary password.
- RH `/departamentos`: `Excluir` exposed `Confirmar`/`Cancelar`; `Cancelar` returned to the non-confirmed state.
- RH `/departamentos`: `Confirmar` removed only the fixture department.

## Guardrails

- Public landing remains untouched.
- Production remained read-only; this lane ran locally.
- Fixture records were disposable and created by the spec.
- The company fixture was reactivated after the suspend assertion.
- The department delete assertion targeted a fixture department created specifically for the test.

## Remaining Classes

Still not validated by this lane:

- `Revogar` invitation flows.
- Import confirmation flows.
- Export/download side effects.
- Completed create/update submissions for company, user, admin master, department and profile forms.
- Editorial/gamification content mutation flows such as content, lesson, draft and publish controls.
- Sensitive module workflows remain fail-closed.
