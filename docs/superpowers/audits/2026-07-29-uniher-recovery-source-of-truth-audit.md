# UniHER recovery source-of-truth audit

Date: 2026-07-29

## Decision

Use `origin/codex/uniher-wave3-collaborator-nr1` at `d26ef701b81a84e37e5308968b866f7b32143ef2` as the current recovery source of truth.

Do not rebuild the platform manually from the visual-only impression. The richer implementation is already present in Git; the live/public experience is the drift point.

## Evidence

- Historical baseline before 2026-06-29: `9ca4bd8d9d60c25a0b116d8ded0009cff831a551`, `feat: add guided first access flow`, dated 2026-04-04 18:38:29 -03.
- Default branch: `origin/main` at `f9188854dc49b09d681e4ddb73c4cda38ef39749`.
- Visual leadership branch: `origin/codex/uniher-finish-visual-leadership-demo` at `a19ee9083f069bee6b517422a87aa6f4ff43d5e4`.
- Richest recovery branch: `origin/codex/uniher-wave3-collaborator-nr1` at `d26ef701b81a84e37e5308968b866f7b32143ef2`.

## Inventory Comparison

| Ref | Platform pages | API routes | Components | Lib files | Repositories | Tests | Docs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `9ca4bd8` | 23 | 107 | 50 | 31 | 14 | 16 | 23 |
| `origin/main` | 26 | 121 | 67 | 54 | 19 | 88 | 68 |
| `origin/codex/uniher-finish-visual-leadership-demo` | 33 | 124 | 67 | 59 | 19 | 105 | 637 |
| `origin/codex/uniher-wave3-collaborator-nr1` | 33 | 127 | 67 | 66 | 19 | 113 | 670 |

Only two source files from the old baseline are removed in the richer branches:

- `src/components/platform/StatCard.tsx`
- `src/components/platform/StatCard.module.css`

The old platform APIs are not broadly missing. The richer branches add community, collaborator objectives, Yavix/COPSOQ gates, wellbeing routes, company module gates, and employee import routes.

## Live Drift

`https://uniher.com.br/` currently serves a static landing HTML with `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`.

Authenticated routes such as `/auth`, `/dashboard`, and `/comunidade` go through the Next app, but production is not clearly serving the latest `wave3` candidate as the unified product surface.

`https://uniher.com.br/api/health` responded on 2026-07-29 with healthy DB status, 9 users, 1 company, and no pending write queue items.

## Fresh Local Gates

Executed on `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`:

- `npm run test:next-config`: PASS, 1/1.
- `npx tsc --noEmit`: PASS.
- `npm run check:release-env`: FAIL expected for production; missing `JWT_SECRET`, `JWT_REFRESH_SECRET`, `UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET`, `NEXT_PUBLIC_APP_URL`, and `DATABASE_PATH`; `ACCESS_TOKEN_BLACKLIST` remains HOLD for production.

## Recovery Plan

1. Treat `wave3` as the integration candidate, not `main` and not the visual branch alone.
2. Keep production HOLD until release env passes with real target secrets, database path, URL, and token revocation decision.
3. Use the existing visual branch only as already-integrated visual evidence inside `wave3`.
4. Promote first to local/homologation with the `wave3` worktree, then rerun `test:rh`, `test:visual-ux-smoke`, `check:release-env`, and a host-target smoke.
5. Only after those gates pass, update the deploy target so the live platform points at the candidate commit instead of the stale/static public surface.

## Operator Note

The platform was not lost in Git. The current failure mode is source-of-truth and deployment drift: the useful implementation lives in `wave3`, while the visible/public experience still reflects an older or split deployment surface.
