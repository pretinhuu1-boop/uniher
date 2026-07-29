# UniHER Wave 8 achievements scorecard

**Date:** 2026-07-22
**Lane:** `wave8-achievements`
**Route:** `/conquistas`
**Status:** PASS after revocation correction

## Scope Delivered

- New private achievements domain.
- New migration `059_private_achievements.sql`.
- New deterministic achievement catalog over non-revoked eligible events.
- Collaborator self-only API:
  - `GET /api/collaborator/achievements`
- Functional `/conquistas` page with loading, denied, error, earned, locked
  and revoked states.
- DSAR export includes `privateAchievements`.
- Admin/RH fulfilled user erasure hard-deletes `private_achievements`.

## Post-Audit Correction

PASS on 2026-07-23:

- Added a regression proving a revoked achievement remains `revoked` across
  repeated syncs after the qualifying event is revoked.
- Patched achievement persistence so a previously `revoked` row cannot be
  overwritten to `in_progress` by a later sync that still has no qualifying
  event.
- Confirmed company scoping remains intact for the same user in another
  company.

RED receipt before the patch:

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts
```

Result before patch: 1 failed, 2 passed. Failure showed
`repeatedCompletedAchievement.status` returning `in_progress` instead of
`revoked`.

GREEN receipt after the patch:

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
```

Result after patch: 2 files, 19 tests passed.

## Privacy Findings

PASS:

- Achievements derive only from eligible objective/challenge events.
- No legacy `badges` or `user_badges` are read or written.
- No rarity, holder count, social sharing, points, Liga or ranking is exposed.
- No Semaforo, NR-1, agenda, exam, appointment, health or denunciation inputs
  are used.

## Validation

PASS:

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts tests/unit/company-challenges.test.ts tests/unit/personal-objectives.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
```

Result: 6 files, 36 tests passed.

PASS:

```powershell
npx tsc --noEmit
```

PASS:

```powershell
npm run build
```

Result: build passed, 139 routes generated. Existing Turbopack/NFT warnings
remain tied to `next.config.ts` and `src/app/api/admin/system/ops/route.ts`.

## Browser Evidence

Output directory:

`C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-wave8-achievements-2026-07-22`

Required screenshots:

- `conquistas-desktop.png`
- `conquistas-desktop-viewport-bottom.png`
- `conquistas-mobile.png`
- `conquistas-mobile-viewport-top.png`
- `conquistas-mobile-viewport-bottom.png`
- `metrics.json`

Evidence caveat:

- The screenshot set is historical Wave 8 browser evidence. A later audit found
  the mobile top/bottom screenshots weak because they were byte-identical, so
  this scorecard no longer treats those two mobile captures as independent
  bottom-of-page visual proof.

Metrics:

- desktop 1440x1000: no horizontal overflow.
- mobile 390x844: no horizontal overflow.
- route loaded as authenticated `/conquistas`.
- heading observed: `Minhas conquistas`.

## Residuals

- Local QA synced private achievement rows for `colab@teste.com`.
- Legacy `/api/collaborator/badges` remains out of scope.
- Semaforo and Liga remain blocked by separate gates.

## Promotion Recommendation

Promote Wave 8 into the final allowlist after full diff review. Do not stage
with broad commands. If final visual approval depends on the bottom of
`/conquistas`, recapture fresh mobile top/bottom evidence before promotion.
