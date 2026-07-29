# UniHER wave3 merge recovery map

Date: 2026-07-29

## Decision

The correct recovery path is **merge `origin/codex/uniher-wave3-collaborator-nr1` into `main` after gates**, not rebuild old logic into another visual branch.

`origin/main` is the merge-base of `origin/codex/uniher-wave3-collaborator-nr1`.

Current relationship:

- `main`: `f9188854dc49b09d681e4ddb73c4cda38ef39749`
- recovery candidate: `d26ef701b81a84e37e5308968b866f7b32143ef2`
- ahead/behind: `main...wave3 = 0 behind / 221 ahead`

This means Git can integrate the candidate as a fast-forward or clean PR merge if `main` does not move. The hard part is product and release validation, not textual conflict resolution.

## What Was Preserved From The Old Complete Platform

Baseline before 2026-06-29:

- `9ca4bd8d9d60c25a0b116d8ded0009cff831a551`
- date: 2026-04-04 18:38:29 -03
- subject: `feat: add guided first access flow`

Old platform pages missing in `wave3`: **none found**.

Old API routes missing in `wave3`: **none found**.

Old source files removed in `wave3`:

- `src/components/platform/StatCard.tsx`
- `src/components/platform/StatCard.module.css`

These two removals should be reviewed during visual/component QA, but they are not evidence that the old business logic or API contracts were lost.

## What Wave3 Adds Beyond The Old Platform

New platform pages not present in the old baseline:

- `/avaliacao-nr1`
- `/canal-denuncias`
- `/comunidade`
- `/comunidade/gerenciar`
- `/concierge`
- `/desenvolvimento-humano`
- `/nr1`
- `/produtos-modulos`
- `/saude-primaria`
- `/viva-sipat`

New API routes not present in the old baseline:

- `/api/collaborator/achievements`
- `/api/collaborator/company`
- `/api/collaborator/feed/[id]/save`
- `/api/collaborator/feed/[id]/support`
- `/api/collaborator/feed/[id]/supporters`
- `/api/collaborator/objectives`
- `/api/collaborator/objectives/[id]`
- `/api/collaborator/saved`
- `/api/company/modules`
- `/api/rh/community/posts`
- `/api/rh/community/posts/[id]`
- `/api/rh/employees/import-commit`
- `/api/rh/employees/import-preview`
- `/api/rh/employees/import-template`
- `/api/wellbeing/check-out`
- `/api/wellbeing/daily-status`
- `/api/yavix/copsoq/answer`
- `/api/yavix/copsoq/bootstrap`
- `/api/yavix/copsoq/consent`
- `/api/yavix/copsoq/submit`

## Main To Wave3 Change Surface

Files changed from `origin/main` to `origin/codex/uniher-wave3-collaborator-nr1`:

| Area | Changed file hits | Merge role |
| --- | ---: | --- |
| Auth, security, tenant, privacy | 49 | Preserve old contracts; add revocation/session, role scoping, release preflight, DSAR/import privacy. |
| Platform shell, visual, navigation | 63 | Keep the useful new visual shell and role navigation; validate no lost destinations. |
| RH/Admin/dashboard/employee ops | 52 | Add dashboard sections, company modules, health DB reporting, employee import. |
| Collaborator, wellbeing, agenda, semaforo | 20 | Add wellbeing events, self-report semaforo, stricter agenda/collaborator contracts. |
| Community, campaigns, education | 5 | Preserve community/feed/editorial and campaign lifecycle hardening. |
| NR-1/Yavix/sensitive modules | 18 | Keep fail-closed/gated surfaces; do not promote as real NR-1 operation. |
| Release, tests, smoke, evidence | 55 | Use as the validation harness before any promotion. |

Counts are overlap-oriented because some files serve more than one area.

## Where Each Merge Lane Enters

| Lane | Source in wave3 | Enters into | Gate before merge |
| --- | --- | --- | --- |
| Old platform logic and APIs | preserved from `9ca4bd8` and `main` ancestry | `main` through wave3 fast-forward/PR | route/API preservation check; no old routes missing. |
| New visual shell | `src/components/platform/*`, `src/app/platform-theme.css`, role pages | `main` through wave3 | `test:visual-ux-smoke`, sidebar geometry, desktop/mobile screenshots. |
| Auth/session/security | `src/lib/auth/*`, auth API routes, token blacklist, release preflight | `main` through wave3 | unit auth tests, `check:release-env`, production token blacklist decision. |
| Tenant/RH/API hardening | company, invites, departments, leader, RH user APIs | `main` through wave3 | focused tenant negative tests and RH suite. |
| Dashboard/RH/Admin | dashboard components, view-models, sections, RH/Admin pages | `main` through wave3 | `test:rh`, dashboard unit tests, privacy suppression checks. |
| Colaboradora/wellbeing/agenda | wellbeing routes, agenda validation, semaforo self-report | `main` through wave3 | wellbeing/agenda/semaforo unit tests and collaborator smoke. |
| Community/campaigns | community APIs/components, campaign repository/route fixes | already in main plus wave3 hardening | community/campaign tests, lifecycle and tenant checks. |
| Yavix/NR-1 | COPSOQ routes, consent gates, runtime entitlement, specs | `main` as gated module only | fail-closed tests; keep real operation HOLD pending Yavix contract. |
| Employee import | RH import pages/routes/libs/migrations/tests | `main` through wave3 | HMAC secret preflight, import API/UI/privacy tests. |
| Deploy/release harness | release scripts, visual smoke runner, evidence docs | `main` through wave3 | build, typecheck, unit, RH, visual smoke, target-host preflight. |

## Merge Strategy

Recommended strategy:

1. Keep `origin/codex/uniher-wave3-collaborator-nr1` as the integration branch.
2. Do not cherry-pick by module unless a gate fails and a smaller rollback is needed.
3. Create a recovery PR from `codex/uniher-wave3-collaborator-nr1` to `main`.
4. Before merging, rerun the candidate gates in the clean `wave3` worktree.
5. If `main` has not advanced, merge can be fast-forward-equivalent.
6. After merge, deploy only to homologation first.
7. Production stays HOLD until env, DB, secrets, token revocation, smoke, and visual approval pass.

Do not deploy by copying the static landing or by manually mixing folders. That is how the current public/app drift becomes harder to reason about.

## Required Pre-Merge Gates

Minimum technical gate:

- `git status --short`
- `npm run test:next-config`
- `npx tsc --noEmit`
- `npm run test:unit`
- `npm run build`
- `npm run test:rh`
- `npm run test:visual-ux-smoke`
- `npm run check:release-env`
- `git diff --check`

Current fresh status on 2026-07-29:

- `npm run test:next-config`: PASS.
- `npx tsc --noEmit`: PASS.
- `npm run check:release-env`: FAIL expected for production because env files were absent; missing `JWT_SECRET`, `JWT_REFRESH_SECRET`, `UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET`, `NEXT_PUBLIC_APP_URL`, and `DATABASE_PATH`; `ACCESS_TOKEN_BLACKLIST` remains HOLD for production.

## Remaining Missing Work

What is missing is not old source code. The missing items are promotion gates:

- production env/secrets/DB path configured and verified;
- persistent access-token revocation decision for production;
- supply-chain vulnerability triage before production;
- target-host smoke against the real deployed candidate;
- final human visual approval;
- Yavix/NR-1 official contract/API/sandbox/auth/results/scoring/governance before any real compliance claim;
- explicit decision on whether `/` remains a static commercial landing or is routed as part of the Next app with a controlled split.

## Stop Conditions

- `PASS`: all pre-merge gates pass and the PR is ready for main/homologation.
- `HOLD`: gates pass locally but production env, visual approval, legal/NR-1/Yavix, or deploy approval is missing.
- `FAIL`: a preserved old route/API is missing, tests fail, build fails, or smoke finds visual/route breakage.
- `ESCALATE`: merge base changes, `main` advances with conflicting work, or deploy target cannot be proven.

