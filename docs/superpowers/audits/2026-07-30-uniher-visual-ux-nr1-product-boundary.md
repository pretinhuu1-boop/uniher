# UniHER visual UX NR-1 and product boundary audit

Date: 2026-07-30
Branch: codex/uniher-wave3-collaborator-nr1

## Intent

Continue the authenticated-platform recovery goal without touching the public landing page. The wave target was to prevent specs/placeholders from appearing where a real or safely gated product surface already exists.

## RED findings

- `visual-ux` still expected the old RH NR-1 shell (`/nr1`) and the collaborator COPSOQ runtime under mock, even though the current safe behavior is fail-closed redirect.
- The visual matrix failed on admin `/produtos-modulos` in all 4 viewports because the page fetched `/api/company/modules` without a tenant company scope.
- The gate only reported a generic browser console 404, so the matrix lacked the exact failing URL.

## Changes

- Updated visual routes with explicit compatibility redirect expectations instead of expecting placeholder pages.
- Updated NR-1 visual checks:
  - RH sidebar must not show the NR-1 direct product link.
  - RH direct `/nr1` returns to `/produtos-modulos` without COPSOQ/Yavix/runtime/spec copy.
  - Collaborator `/avaliacao-nr1` without authorized runtime returns to `/colaboradora` without COPSOQ/Yavix/runtime/spec copy.
- Added response-status capture to the visual matrix so future 4xx/5xx failures include the response URL.
- Gated `produtos-modulos` SWR fetch by `user.companyId`, preventing admin users without tenant scope from calling the company modules endpoint.
- Added sidebar tenant-logo fallback to initials if a company logo asset fails.

## Evidence

- `npx vitest run tests/unit/platform/sidebar-capability.test.tsx` -> PASS, 24 tests.
- `npx vitest run tests/unit/module-shells.test.ts tests/unit/platform/sidebar-capability.test.tsx` -> PASS, 40 tests.
- `npx playwright test --config=tests/playwright.config.ts --project=visual-ux -g "NR-1 habilitado fica oculto|Colaboradora com NR-1 habilitado sem mock|Colaboradora mobile sidebar evidence" --workers=1` -> PASS, 3 tests.
- `VISUAL_UX_CAPTURE_SCREENSHOTS=1 npx playwright test --config=tests/playwright.config.ts --project=visual-ux -g "route and viewport matrix is reproducible|sidebar top bottom and bottom nav geometry are guarded" --workers=1` -> PASS, 2 tests.
- `docs/superpowers/evidence/visual-ux-smoke-latest/screen-smoke-report.md` -> total 196, PASS 196, FAIL 0.
- `docs/superpowers/evidence/visual-ux-smoke-latest/sidebar-geometry-report.json` -> `issues: []`.
- `npx playwright test --config=tests/playwright.config.ts --project=platform-product-boundary --workers=1` -> PASS, 22 tests.
- `npx tsc --noEmit` -> PASS.
- `npm run build` -> PASS.
- `node --test tests/prepare-playwright-static.test.cjs` -> PASS, 2 tests.
- `npm run prepare:standalone` -> PASS.
- `git diff --check` -> PASS.
- Landing denylist diff count for public/landing paths -> 0.
- `npm run check:release-env` -> FAIL locally because this worktree has no loaded env files or secrets; rerun on VPS before restart.
- `claude --print ...` -> unavailable in this session; command timed out after 60s.
- VPS deploy found `/logo-uniher.png` returning 404 from the standalone runtime when `public/` was not copied into `.next/standalone/public`; corrected on VPS and persisted as `npm run prepare:standalone`.
- VPS `npm run check:release-env` -> PASS 9, HOLD 0, FAIL 0.
- Production landing header after deploy -> `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`.
- Production `/logo-uniher.png` -> HTTP 200, `content-type: image/png`.
- Production `/api/health` -> healthy.
- Production authenticated `/produtos-modulos` smoke -> heading visible, no forbidden COPSOQ/Yavix/spec copy, no 4xx/5xx responses, no console errors.
- Production screenshot: `docs/superpowers/evidence/production-produtos-modulos-1976f8d-2026-07-30.png`.

## Gate status

- Landing page: not modified in this wave.
- Sensitive modules: still fail-closed; no NR-1/COPSOQ/Yavix runtime is exposed from shell or compatibility routes.
- Product modules: real tenant endpoint remains the source of truth only when tenant scope exists.
- Production deploy: completed for `1976f8d`; follow-up deploys must run `npm run prepare:standalone` before PM2 restart.
- Human visual approval: pending, but technical production smoke passed.
