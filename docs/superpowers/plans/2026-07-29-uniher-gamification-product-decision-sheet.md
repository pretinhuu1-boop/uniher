# UniHER Gamification Product Decision Sheet

Date: 2026-07-29
Status: HOLD for implementation; authenticated copy boundary started in WB-21; public/online landing frozen
Source artifacts:
- `docs/superpowers/audits/2026-07-29-uniher-safe-parity-matrix.md`
- `docs/superpowers/audits/2026-07-29-uniher-full-gap-map-after-main-merge.md`
- `docs/superpowers/plans/2026-07-29-uniher-wave-b-implementation-ledger.md`

## Decision Needed

The old baseline included XP, points, badges, leaderboard, leagues and rewards. The current platform intentionally keeps those areas contained because ranking/reward mechanics can create privacy, labor, clinical, discrimination and commercial overclaim risk.

WB-20 removed accidental Admin reactivation paths. Any return of gamification must be an explicit product rebuild, not a rollback or reconnection of legacy endpoints.

## Non-Negotiable Gates

- No public leaderboard by default.
- No employer-facing individual health, Semaforo, mood, score or diagnostic ranking.
- No monetary or benefit-like reward economy without legal/commercial approval.
- No shared badges, holder counts, rarity or points value without opt-in and privacy review.
- No reactivation of `/api/admin/badges`, legacy league/reward APIs, or `challenge`/`gamification` Admin alert types.
- No production claim until the host release gate and human product approval pass.
- Do not change the current public/online landing as part of this decision sheet; landing copy remains frozen unless a separate user-approved landing wave is opened.

## Options

| Option | Product meaning | Allowed implementation | Decision |
| --- | --- | --- | --- |
| A. Stop promising classic gamification | Keep current private achievements/objectives/challenges only. | Copy/navigation cleanup, sales doc correction, keep APIs 410/privacy-review. | Recommended default until product owner approves more. |
| B. Rebuild safe private motivation | Personal progress only, no public comparison. | Private achievements, voluntary challenges, non-transferable milestones, aggregate-only admin reports. | Possible after privacy/product spec. |
| C. Rebuild social ranking/rewards | Public or team competition, leagues, points economy, redemption. | New contracts, opt-in, anti-harm policy, legal approval, audit, abuse handling, retention, appeal/removal flow. | HOLD_EXTERNAL. |

## Merge Entry Map

| Old capability | Current safe surface | If approved, enter through | Required tests |
| --- | --- | --- | --- |
| XP/points on check-in | Private wellbeing check-in without points. | New private progress ledger, not legacy `users.points`. | Check-in returns no ranking fields unless feature flag and contract are active. |
| Badges | Private achievements without rarity/holder counts. | `collaborator/achievements` style projection only. | No `points`, `rarity`, `holder_count`, public sharing by default. |
| Leaderboard/league | 410/privacy-review or HOLD shell. | New module with opt-in and suppression rules. | Tenant isolation, no health data, no default public names, no cross-company exposure. |
| Rewards/redemptions | 410/privacy-review. | New approved rewards service with audit and terms. | Legal gate, inventory/fulfillment state, no implicit financial claims. |
| RH-managed challenges/objectives | Partial/safe collaborator challenge flow. | New RH challenge manager with public challenge projection. | RH same-company scope, collaborator opt-in, no points/ranking copy. |
| Admin badge CRUD | Removed in WB-20. | Do not restore. If needed, create a new reviewed achievement taxonomy module. | Admin cannot create points/rarity badges; old `/api/admin/badges` remains 410. |

## Next Wave Contract

ID: WB-21
Intent: decide product truth before any gamification rebuild.
Write scope: docs/copy/tests only unless approval is recorded.
Denylist: legacy ranking/reward endpoint activation, DB reward writes, `users.points`, `league_*`, public badge sharing, production deploy, current public/online landing edits.
Evidence:
- Product owner decision recorded as A, B or C.
- If A: authenticated/platform copy scan proves no classic gamification promise remains in first-access and review/HOLD surfaces. Public/online landing cleanup is not part of WB-21.
- If B/C: new implementation plan with data model, permissions, privacy review, legal/commercial approval, and RED/GREEN test list.
Gate: HOLD until decision is explicit.

## WB-21 Receipt

Decision: PASS technical authenticated copy gate, HOLD product implementation, HOLD landing changes.

Changes:
- Active first-access tour copy no longer promises "conteudo diario e gamificacao"; it now uses "conteudo diario e recorrencia guiada".
- Public/online landing copy remains frozen and was returned to zero content diff after the user clarified that the current online landing must remain unchanged.
- `tests/unit/privacy/gamification-product-copy-boundary.test.ts` prevents first-access and review/HOLD routes from promising classic gamification, ranking, rewards, XP, redemption, leaderboard or points before approval.
- Review routes may continue to state that gamification/league surfaces are in review, but cannot promise operational rewards, redemption, leaderboard or points.

Verification:
- `npm run test:unit -- tests/unit/privacy/gamification-product-copy-boundary.test.ts` passed: 1 file / 2 tests after the landing-freeze adjustment.
- `npm run test:unit -- tests/unit/privacy/landing-freeze-boundary.test.ts` passed: 1 file / 1 test, proving the frozen landing paths still match baseline `0fb1d517d9ce91cdab1db3703f33f2611d31abfa` and have no unstaged or staged diff in this wave.
- `git diff --name-only -- src/app/layout.tsx src/app/proposta/page.tsx src/app/welcome-colaboradora/quiz/page.tsx src/app/welcome/page.tsx src/components/layout/Marquee.tsx src/components/layout/Navbar.tsx src/components/sections/QuizPromo.tsx src/components/sections/ROI.tsx` returned no paths.

Remaining:
- Product owner still must choose Option A, B or C before any implementation beyond copy/tests/docs.
