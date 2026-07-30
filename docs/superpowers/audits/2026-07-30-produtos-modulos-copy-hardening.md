# Produtos e Modulos copy hardening

Date: 2026-07-30
Code commit: d594587

## Decision

PRODUCTION PASS for this copy-hardening wave.

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
- Production deploy: VPS `/var/www/uniher` fast-forwarded to `d594587`; `npm ci`, `npm run build`, `npm run db:migrate`, `npm run check:release-env` and `pm2 restart uniher` passed. The first deploy command used the stale script name `check-release-env`; the corrected script is `check:release-env`.
- Production health: `https://uniher.com.br/api/health` returned `status: healthy`.
- Landing guard: `HEAD https://uniher.com.br/` kept `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`.
- Production authenticated smoke: RH login reached `/produtos-modulos` on desktop and mobile; `Bloqueado por contrato` and `Auditoria tecnica` were visible; no forbidden `HOLD`, `company_modules`, runtime, scoring, intake, `Auditoria no backend` or `Modulo sensivel em HOLD` text appeared; no horizontal overflow was detected.

## Evidence

- `docs/superpowers/evidence/produtos-modulos-ui-local-2026-07-30/desktop-1366-produtos-modulos.png`
- `docs/superpowers/evidence/produtos-modulos-ui-local-2026-07-30/mobile-390-produtos-modulos.png`
- `docs/superpowers/evidence/production-produtos-modulos-copy-hardening-d594587-2026-07-30/desktop-produtos-modulos.png`
- `docs/superpowers/evidence/production-produtos-modulos-copy-hardening-d594587-2026-07-30/mobile-produtos-modulos.png`

## Residual Risk

- This wave changes only copy and tests. It does not close product contracts for sensitive modules.
- Older untracked evidence folders in the worktree remain intentionally unstaged.
