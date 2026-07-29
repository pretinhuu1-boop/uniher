# Claude review - UniHER wave3 merge recovery

Date: 2026-07-29
Reviewer: Claude CLI, read-only mode
Branch: `codex/uniher-wave3-collaborator-nr1`
Target: `origin/main`

## First Review Decision

Claude returned **conditional merge**.

Required before PR/merge:

- Add DSAR export coverage for `health_events` and `user_consents`; review also mentioned `user_uploads`.
- Add `.env.example` for required runtime variables.
- Treat in-memory access-token blacklist as production HOLD unless accepted or enforced externally.

Additional notes:

- `campaign_participants` was mentioned by Claude, but this table does not exist in the current tree. Campaign/participation data is represented through the eligible participation ledger where applicable.
- Yavix/NR-1 real operation remains HOLD and fail-closed.

## Fixes Applied After First Review

- `src/lib/privacy/dsar-export.ts` now exports optional `healthEvents`, `userConsents`, and `userUploads` arrays when those tables exist.
- `tests/unit/privacy/dsar-export-coverage.test.ts` verifies subject-only DSAR coverage and graceful empty arrays when optional tables are absent.
- `.env.example` documents required runtime variables without real secrets.
- `src/components/gamification/DailyLesson.tsx` allows daily lesson titles to wrap on mobile.
- `docs/superpowers/evidence/visual-ux-smoke-latest/` was regenerated after the visual fix.

## Second Review Decision

Claude returned **ready to open PR**.

Findings:

- P0: none found.
- Remaining P1: audit trail cosmetics. Some routes pass `actorEmail: context.auth.userId`, which stores a user id in an email-labelled audit field. This is misleading but not a merge blocker.

Confirmed HOLD gates:

- Production deploy / PM2 operational readiness.
- NR-1/Yavix real operation.
- Persistent blacklist must use SQLite in production.
- Deletion automation and DB backup remain operational follow-ups.
- Human visual approval remains external despite visual smoke evidence.

## Verification Run In This Session

- `npm run test:next-config`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run test:unit`: PASS, 79 files / 657 tests after DSAR fixes.
- `npm run build`: PASS, 151 static pages generated.
- `npm run test:rh`: PASS, 22/22.
- `npm run test:visual-ux-smoke`: initially FAIL for mobile lesson title clipping; after fix PASS, 2/2 and 192/192 visual matrix.
- `node --test tests/check-release-env-security.test.cjs`: PASS, 4/4.
- `npm run check:release-env`: expected FAIL without env files; production remains HOLD until real secrets, DB, URL, smoke accounts, and SQLite blacklist are configured.

## Coordinator Decision

Open PR from `codex/uniher-wave3-collaborator-nr1` to `main`.

Do not merge to production or deploy production from this PR without the external HOLD gates.
