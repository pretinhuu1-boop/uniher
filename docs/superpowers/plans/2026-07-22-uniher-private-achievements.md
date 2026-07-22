# UniHER Wave 8 private achievements plan

## Goal

Replace `/conquistas` placeholder with a functional private achievements page
backed by the eligible participation ledger.

## Tasks

- [ ] Add migration `059_private_achievements.sql`.
- [ ] Add achievement types, catalog, repository and service.
- [ ] Add `GET /api/collaborator/achievements` for collaborator self-only sync.
- [ ] Render `/conquistas` with loading, denied, error, locked and earned
  states.
- [ ] Extend DSAR and fulfilled erasure.
- [ ] Add unit tests for deterministic evaluation, revocation and erasure.
- [ ] Run focused tests, TypeScript, build and screenshots.

## Validation Commands

```powershell
npm run test:unit -- tests/unit/private-achievements.test.ts tests/unit/company-challenges.test.ts tests/unit/personal-objectives.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
npx tsc --noEmit
npm run build
```
