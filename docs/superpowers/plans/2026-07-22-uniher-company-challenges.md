# UniHER Wave 7 company challenges plan

## Goal

Replace the `/desafios` placeholder with a narrow, functional collaborator
experience backed by a new privacy-safe challenge domain.

## Tasks

- [ ] Add migration `058_company_challenges_v2.sql`.
- [ ] Add challenge types, approved catalog and API helpers.
- [ ] Add repository and service with self-only, company-scoped operations.
- [ ] Replace collaborator challenge routes with v2 handlers.
- [ ] Render `/desafios` with loading, denied, error, empty, joined, completed
  and left states.
- [ ] Extend DSAR and fulfilled erasure.
- [ ] Add unit tests for join/progress/complete/leave/cross-company/erasure.
- [ ] Run focused tests, TypeScript, build and browser screenshot gates.

## Validation Commands

```powershell
npm run test:unit -- tests/unit/company-challenges.test.ts tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts tests/unit/privacy/gamification-write-containment.test.ts
npx tsc --noEmit
npm run build
```

## Screenshot Output

`C:\Users\user\Documents\Codex\2026-07-21\uniher-redesign-paginas-pendentes\outputs\uniher-wave7-challenges-2026-07-22`
