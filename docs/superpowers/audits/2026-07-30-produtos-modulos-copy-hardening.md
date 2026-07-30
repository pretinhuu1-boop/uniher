# Produtos e Modulos copy hardening

Date: 2026-07-30
Commit target: pending

## Decision

LOCAL PASS. Production deploy and smoke remain pending.

## Scope

- Intent: remove visible spec/internal jargon from the authenticated real `/produtos-modulos` surface.
- Allowlist: `/produtos-modulos`, platform boundary tests, unit shell tests, this goal plan, local screenshots.
- Denylist: public landing, marketing routes, `public`, sensitive module activation, NR-1/Yavix runtime, Denuncias intake, Concierge workflow, SIPAT operation, DH trails, Liga/ranking/rewards.

## Changes

- Replaced visible `HOLD`, `company_modules`, backend, runtime, scoring and intake wording with product-facing Portuguese.
- Kept the existing company module fetch/update contract and Master Admin non-sensitive edit rule unchanged.
- Kept sensitive modules blocked with `Requer contrato` / `Bloqueado por contrato` copy.
- Hardened unit and Playwright canaries against reintroducing internal jargon.
- Changed the NR-1 redirect E2E wait from `waitForURL` to `expect(page).toHaveURL` after one observed load-event timeout where logs showed the redirect had reached `/colaboradora`.

## Verification

- RED: `npm run test:unit -- tests/unit/module-shells.test.ts` failed before implementation on missing `Bloqueado por contrato`.
- GREEN: `npm run test:unit -- tests/unit/module-shells.test.ts tests/unit/nr1-runtime-entitlement.test.ts tests/unit/nr1-preview-state.test.ts tests/unit/platform/navigation.test.ts` passed, 4 files / 58 tests.
- E2E: `npx playwright test --config=tests/playwright.config.ts --project=platform-product-boundary` passed, 22/22.
- Typecheck: `npx tsc --noEmit` passed.
- Build: `npm run build` passed.
- Diff check: `git diff --check` passed.
- Landing denylist: `git diff --name-only -- src/app/page.tsx 'src/app/(marketing)' src/components/landing public` returned empty.
- Grep: no `HOLD`, `company_modules`, `runtime`, `scoring`, `intake`, `Auditoria no backend` or `Modulo sensivel em HOLD` remains in `src/app/(platform)/produtos-modulos/page.tsx`.
- Claude review: first pass found no blocking findings and suggested test hardening; second pass returned no blocking findings.

## Evidence

- `docs/superpowers/evidence/produtos-modulos-ui-local-2026-07-30/desktop-1366-produtos-modulos.png`
- `docs/superpowers/evidence/produtos-modulos-ui-local-2026-07-30/mobile-390-produtos-modulos.png`

## Residual Risk

- This wave changes only copy and tests. It does not close product contracts for sensitive modules.
- Production must still be deployed and smoked before the wave is considered production PASS.
