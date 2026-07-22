# UniHER Wave 8 achievements scorecard

**Date:** 2026-07-22
**Lane:** `wave8-achievements`
**Route:** `/conquistas`
**Status:** PASS local validation

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
with broad commands.
