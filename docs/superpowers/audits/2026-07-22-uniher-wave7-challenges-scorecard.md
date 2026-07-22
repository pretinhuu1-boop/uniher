# UniHER Wave 7 challenges scorecard

**Date:** 2026-07-22
**Lane:** `wave7-challenges`
**Route:** `/desafios`
**Status:** PASS local validation

## Scope Delivered

- New privacy-safe company challenge v2 domain.
- New migration `058_company_challenges_v2.sql`.
- New static approved challenge catalog.
- Collaborator self-only APIs:
  - `GET /api/collaborator/challenges`
  - `POST /api/collaborator/challenges`
  - `PATCH /api/collaborator/challenges/[id]`
- Functional `/desafios` page with loading, denied, error, empty, joined,
  completed, left and catalog states.
- DSAR export includes `companyChallenges`.
- Admin/RH fulfilled user erasure hard-deletes `user_company_challenges` and
  eligible participation events.

## Privacy Findings

PASS:

- Events are emitted only as `company_challenge` source domain.
- No points, badges, league, activity log, health, Semaforo, NR-1, exam or
  agenda tables are written by the service.
- Legacy `challenges` and `user_challenges` are not reused for the new page.
- RH challenge management routes were not reactivated in this wave.

## Validation

PASS:

```powershell
npm run test:unit -- tests/unit/company-challenges.test.ts tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
```

Result: 5 files, 52 tests passed.

PASS:

```powershell
npx tsc --noEmit
```

PASS:

```powershell
npm run build
```

Result: build passed, 138 routes generated. Existing Turbopack/NFT warnings
remain tied to `next.config.ts` and `src/app/api/admin/system/ops/route.ts`.

## Browser Evidence

Output directory:

`C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-wave7-challenges-2026-07-22`

Required screenshots:

- `desafios-desktop.png`
- `desafios-desktop-viewport-bottom.png`
- `desafios-mobile.png`
- `desafios-mobile-viewport-top.png`
- `desafios-mobile-viewport-bottom.png`
- `metrics.json`

Metrics:

- desktop 1440x1000: no horizontal overflow.
- mobile 390x844: no horizontal overflow.
- route loaded as authenticated `/desafios`.
- heading observed: `Desafios da empresa`.

## Residuals

- Local QA created challenge participation rows for `colab@teste.com`.
- RH aggregate challenge management remains out of scope.
- Semaforo and Liga remain blocked by their separate policy/clinical gates.

## Promotion Recommendation

Promote Wave 7 into the final allowlist after full diff review. Do not stage
with broad commands.
