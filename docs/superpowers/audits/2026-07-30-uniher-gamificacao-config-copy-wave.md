## Decision

PASS.

## Scope

- Intent: remove internal governance/contract vocabulary from the real RH/Admin `/gamificacao-config` product surface.
- Source of truth: authenticated no-spec matrix, `/gamificacao-config` source, focused unit canaries, platform product boundary E2E and local screenshots.
- Allowlist: `src/app/(platform)/gamificacao-config/page.tsx`, focused privacy/product-boundary tests, local evidence screenshots, this receipt, matrix/plan status.
- Denylist: public landing, permissions, APIs, database contracts, ranking/rewards/Liga behavior, NR-1/Yavix/COPSOQ, Concierge, Denuncias, SIPAT, Desenvolvimento Humano.

## Changes

- Replaced `governanca privada` with user-facing responsible follow-up copy.
- Replaced `contrato real de conteudo educativo` with `fluxo aprovado de conteudo educativo`.
- Replaced `contrato educativo` in the lesson modal with `campos educativos`.
- Replaced `revisao responsavel` with `validacao responsavel`.
- Added canaries forbidding `governanca privada`, `contrato real` and `contrato educativo` on the approved education/private journey management surface.
- Added E2E visual evidence capture for `/gamificacao-config` desktop and mobile.

## Verification

- RED: `npx vitest run tests/unit/privacy/gamification-product-copy-boundary.test.ts tests/unit/privacy/gamification-safe-projection.test.ts`
  - FAIL before product copy fix: 2 failures from the new canaries.
- GREEN: `npx vitest run tests/unit/privacy/gamification-product-copy-boundary.test.ts tests/unit/privacy/gamification-safe-projection.test.ts`
  - PASS: 2 files, 22 tests.
- `npx vitest run tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts tests/unit/privacy/gamification-product-copy-boundary.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/gamification-write-containment.test.ts`
  - PASS: 5 files, 80 tests.
- `npx tsc --noEmit`
  - PASS.
- `cd tests; npx playwright test --config=playwright.config.ts --project=platform-product-boundary --grep "useful surface keeps non-competitive privacy copy"`
  - PASS: 5 tests.
- `cd tests; npx playwright test --config=playwright.config.ts --project=platform-product-boundary --grep "gamificacao config copy hardening"`
  - PASS: 1 test.
- Source scan:
  - PASS: `governanca privada`, `contrato real` and `contrato educativo` are absent from `src/app/(platform)/gamificacao-config/page.tsx` and present only in canaries.
- Landing guard:
  - PASS: `landing_worktree_diff_count=0`.
- GitHub/VPS:
  - PASS: commit `8efcdc3` pushed to `codex/uniher-wave3-collaborator-nr1`.
  - PASS: VPS fast-forwarded to `8efcdc3`.
  - PASS: `npm ci` found 0 vulnerabilities.
  - PASS: `npm run build`.
  - PASS: `npm run prepare:standalone`.
  - PASS: `npm run check:release-env` -> PASS 9, HOLD 0, FAIL 0.
  - PASS: `pm2 restart uniher --update-env`; `uniher` online.
  - PASS: `/api/health` returned healthy.
  - PASS: public landing smoke returned HTTP 200 with `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`.
- Production render smoke:
  - PASS: `/gamificacao-config` desktop/mobile as RH smoke account rendered required anchors and no `governanca privada`, `contrato real` or `contrato educativo`.

## Evidence

- `docs/superpowers/evidence/gamificacao-config-copy-local-2026-07-30/desktop-1366-gamificacao-config.png`
- `docs/superpowers/evidence/gamificacao-config-copy-local-2026-07-30/mobile-390-gamificacao-config.png`
- `docs/superpowers/evidence/production-gamificacao-config-copy-8efcdc3-2026-07-30/desktop-1366-gamificacao-config.png`
- `docs/superpowers/evidence/production-gamificacao-config-copy-8efcdc3-2026-07-30/mobile-390-gamificacao-config.png`

## Drift / Risk

- No runtime behavior changed.
- The route still uses existing `/api/rh/lessons` behavior; no gamification reward, ranking, Liga or sensitive module behavior was introduced.
- Production PASS is scoped to `/gamificacao-config` copy hardening. The broader no-spec goal remains active.

## Next Wave

- Smallest next step: broad rendered authenticated route sweep from the no-spec matrix to select the next `COPY_FIX`, `COMPAT_REDIRECT` or `HOLD_HIDDEN` target.
- Gate: no landing diff, route/role matrix updated, focused canary, desktop/mobile screenshots for any touched UI.
