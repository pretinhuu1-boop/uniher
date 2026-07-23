# Uncommitted UniHER Worktrees Plan Audit

**Date:** 2026-07-23
**Scope:** dirty/untracked work remaining across UniHER worktrees after PR #7.
**Mode:** read-only audit plus focused test probes; no staging, commit, push, reset, stash, merge or deletion.

## Summary

| Worktree | Branch | Current state | Decision |
|---|---|---|---|
| `C:/Users/user/Documents/uniher-app-audit` | `codex/security-lessons-review` | untracked docs/brainstorm artifacts; branch ahead 3 | HOLD: preserve as documentation package; decide whether to push the 3 commits and package or discard brainstorm runtime artifacts |
| `.worktrees/uniher-deploy-package-fix` | `codex/uniher-deploy-package-fix` | `package.json` staged only | FAIL: incomplete dependency fix; lockfile still references `@types/bcryptjs@2.4.6` |
| `.worktrees/uniher-platform-wave1` | `codex/uniher-platform-wave1` | one DSAR test modified | PASS focused: test-only DSAR resilience additions pass locally |
| `.worktrees/uniher-wave2b-education` | `codex/uniher-wave2b-education` | campaign boundary implementation partial | FAIL/BLOCKED: campaign tests partly pass but legacy lesson/gamification quarantine tests still fail |
| `.worktrees/uniher-wave3-collaborator-nr1` | `codex/uniher-wave3-collaborator-nr1` | leftovers intentionally excluded from PR #7 | HOLD: one real company-profile fix plus Yavix research; CRLF-only noise on two files |

## 1. Root `uniher-app-audit`

### Plan Context

Relevant untracked plan/spec/audit files:

- `docs/superpowers/audits/2026-07-20-uniher-platform-redesign-readiness.md`
- `docs/superpowers/plans/2026-07-20-uniher-collaborator-placeholder-repair.md`
- `docs/superpowers/plans/2026-07-20-uniher-company-community-feed.md`
- `docs/superpowers/plans/2026-07-20-uniher-mobile-shell-findings-correction.md`
- `docs/superpowers/specs/2026-07-20-uniher-nr1-front-visual-audit.md`
- `.superpowers/brainstorm/**`

The readiness audit says the shared redesign foundation and collaborator mobile shell are ready, but the real company-scoped feed and five placeholder screens remain separate future waves. The community-feed plan explicitly says the current route is a containment adapter and must not be marked complete.

### Done

- Documentation captures the mobile-shell PASS, NR-1 preview boundary, placeholder repair queue, and real community-feed plan.
- Branch is already `ahead 3`, with commits:
  - `70c8101 docs: define UniHER platform redesign`
  - `f135745 docs: plan UniHER platform foundation`
  - `bb8c543 chore: ignore local worktrees`

### Missing

- Untracked docs are not committed or pushed.
- Brainstorm runtime artifacts include HTML, logs and PID/state files; these should be intentionally packaged or discarded, not blindly committed.
- Community feed remains NOT STARTED as implementation; placeholder repair remains queued.

### Next Action

Treat as a docs/package cleanup lane. Stage only the intended Markdown docs if still useful; exclude `.superpowers/**/state/*.pid`, logs and transient server files unless an archival reason is explicit.

## 2. `uniher-deploy-package-fix`

### Plan Context

Branch name and previous commit indicate a package/deploy dependency fix. The current staged diff changes:

- `package.json`: `@types/bcryptjs` from `^2.4.6` to `^3.0.3`.

### Done

- `package.json` was staged with the intended type dependency version.

### Missing

- `package-lock.json` still records root `@types/bcryptjs` as `^2.4.6` and `node_modules/@types/bcryptjs` resolved to `2.4.6`.
- `npm ls @types/bcryptjs --depth=0` exits nonzero and reports `(empty)`, meaning local installed state does not prove the staged package change.
- No focused build/typecheck receipt was found for this staged state.

### Decision

FAIL until the lockfile/install state is reconciled and type/build gates pass.

### Next Action

Run a package-lock-only install/update for the intended dependency, stage both `package.json` and `package-lock.json`, then run `npm install`/`npm ci`-compatible verification plus `npx tsc --noEmit`.

## 3. `uniher-platform-wave1`

### Plan Context

The dirty file is:

- `tests/unit/privacy/dsar-export-cooldown.test.ts`

It extends the Wave 1.1 privacy containment/DSAR surface with resilience checks:

- null-safe keyset ordering without temporary B-tree;
- SQLite iterator release before paused DSAR streaming yields rows;
- bounded batch exhaustion before yielding first JSON row.

### Done

- Test fixture was expanded with realistic `users` and `quiz_results` schema.
- `createDsarExportJsonChunks` is now probed directly.
- Focused validation passed:
  - `npm run test:unit -- tests/unit/privacy/dsar-export-cooldown.test.ts`
  - Result: PASS, 1 file / 8 tests.

### Missing

- No code change accompanies the test change in this worktree, which implies the implementation already satisfies these checks or landed earlier.
- The test-only diff is not committed.
- No broader privacy/type/build gate was run in this audit.

### Decision

PASS for focused test intent; HOLD for integration until broader gates and a commit decision.

### Next Action

If this test strengthens an existing DSAR guarantee, commit it as a test-hardening patch after `npx tsc --noEmit` and the relevant privacy suite pass.

## 4. `uniher-wave2b-education`

### Plan Context

The old Wave 2 RH route migration plan is explicitly `BLOCKED/SUPERSEDED`; Wave 2B should be extracted as Campaigns/Education only. Current dirty files implement part of that extracted lane:

- modified campaign routes and repository;
- new `054_wave2b_education_schema.sql`;
- new assignment route;
- new campaign/security boundary tests.

### Done

- Campaign repository now has visibility state, withdrawal, tenant filtering, active join checks and orphan assignment concepts.
- Migration `054_wave2b_education_schema.sql` adds campaign visibility/quarantine fields and orphan inventory.
- `tests/unit/education/campaign-boundary.test.ts` passes as part of focused run.
- Focused run result:
  - `tests/unit/education/campaign-boundary.test.ts`: PASS.
  - overall command failed because security boundary file failed.

### Missing / Failing

`tests/unit/security/wave-2b-education-boundary.test.ts` still fails 5 tests. The failing contract is not campaign CRUD; it is legacy lesson/gamification quarantine:

- legacy lesson GET creates weekly reflection rows, so it is not side-effect free;
- `POST /api/rh/lessons` returns `201` and writes instead of `410 LEGACY_LESSON_QUARANTINED`;
- `PATCH /api/rh/lessons/[id]` mutates legacy lesson rows instead of returning quarantine;
- `DELETE /api/rh/lessons/[id]` deletes legacy lesson rows instead of returning quarantine;
- `POST /api/gamification/daily-lesson` returns success/progress/score and writes progress instead of `410 LEGACY_GAMIFICATION_COMPLETION_QUARANTINED`.

### Decision

FAIL/BLOCKED. The campaign boundary slice is partly implemented, but Wave 2B cannot be promoted while legacy lessons/gamification write paths remain reachable.

### Next Action

Continue from the failing security tests. Decide whether Wave 2B v1 should quarantine legacy lesson endpoints completely or move them behind new `/api/education/*` contracts. Do not commit/push this worktree until the focused command passes and the write set is narrowed to the extracted Wave 2B plan.

## 5. `uniher-wave3-collaborator-nr1`

### Plan Context

This worktree already published PR #7 for the Paola menu redesign governance package. The remaining dirty state is outside that PR allowlist:

- `src/app/(platform)/company-profile/page.tsx` real diff;
- `src/app/(platform)/configuracoes/config.module.css` CRLF-only/no content diff;
- `src/services/objectives.service.ts` CRLF-only/no content diff;
- `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md` untracked research.

### Done

- `company-profile/page.tsx` adds an Admin Master without-company guard: uses `useAuth`, skips `/api/company` for master admin without `companyId`, and shows a "Perfil por empresa" neutral state with link back to `/admin`.
- Yavix research is a substantial public-source discovery artifact: it separates assessment API from provisioning, records public OpenAPI findings, and warns not to infer provisioning details from unavailable public hosts.
- The same company-profile diff is not present in the clean `uniher-production-company-profile-fix` branch; that branch instead contains invite leadership capability fixes.

### Missing

- Company-profile guard has no committed focused test in this worktree.
- Yavix research is untracked and intentionally excluded from PR #7; it should be committed only as a separate architecture/research doc if still wanted.
- CRLF-only files should be left alone or normalized deliberately in a separate cleanup, not bundled with product fixes.

### Decision

HOLD. Split into two clean lanes:

1. Company profile Admin Master no-company UX fix with focused test.
2. Yavix provisioning research doc package.

## Recommended Order

1. **Deploy package fix first**: tiny, but currently inconsistent because lockfile is stale.
2. **Wave 1 DSAR test hardening**: focused test already green; lowest-risk useful commit after broader gate.
3. **Wave 3 leftovers split**: package company-profile and Yavix research separately; ignore CRLF-only noise.
4. **Root docs cleanup**: decide which untracked docs matter; exclude transient `.superpowers` logs/PIDs.
5. **Wave 2B education last**: real partial implementation with failing security contracts; needs a repair loop before any commit.

## Commands Run

- `git worktree list --porcelain`
- `git status --short` / `git status -sb` across all worktrees
- `git diff --stat`, `git diff --cached --stat`, `git diff --check`
- `npm run test:unit -- tests/unit/privacy/dsar-export-cooldown.test.ts` in `uniher-platform-wave1`: PASS, 1 file / 8 tests
- `npm run test:unit -- tests/unit/education/campaign-boundary.test.ts tests/unit/security/wave-2b-education-boundary.test.ts` in `uniher-wave2b-education`: FAIL, 1 file passed, 1 file failed, 17 passed / 5 failed
