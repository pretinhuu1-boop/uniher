# UniHER Wave 6 personal objectives plan

**Status:** PASS local validation on 2026-07-22
**Write set:**

- `docs/superpowers/specs/2026-07-21-uniher-personal-objectives-design.md`
- `docs/superpowers/plans/2026-07-21-uniher-personal-objectives.md`
- `docs/superpowers/audits/2026-07-22-uniher-wave6-objectives-scorecard.md`
- `src/lib/db/migrations/057_personal_objectives.sql`
- `src/types/objectives.ts`
- `src/lib/objectives/catalog.ts`
- `src/lib/objectives/api.ts`
- `src/repositories/objectives.repository.ts`
- `src/services/personal-objectives.service.ts`
- `src/app/api/collaborator/objectives/route.ts`
- `src/app/api/collaborator/objectives/[id]/route.ts`
- `src/app/(platform)/objetivos/page.tsx`
- `src/lib/privacy/dsar-export.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/rh/users/[id]/route.ts`
- `tests/unit/personal-objectives.test.ts`
- `tests/unit/privacy/dsar-stable-pagination.test.ts`

## Harness contract

- Lane: `wave6-objectives`.
- Prerequisite: Wave 5 ledger PASS.
- Allowlist: files listed above plus orchestration ledger updates.
- Denylist: Semaforo, Desafios, Conquistas, Liga, public routes, RH/Yavix/NR-1
  work, legacy gamification writers and reward-claim routes.
- Stop condition: any need for free text, health data, points, ranking, badge,
  employer-assigned individual goals or legacy objective table reads.

## Execution checklist

- [x] Write spec and child plan.
- [x] Add migration 057 with `personal_objectives`.
- [x] Add approved catalog and API helper.
- [x] Add repository and personal objective service.
- [x] Emit Wave 5 eligible participation events from server-side objective
  actions only.
- [x] Create self-only collaborator API.
- [x] Replace `/objetivos` with functional page states.
- [x] Include personal objectives in DSAR.
- [x] Wire fulfilled Admin/RH user deletion to hard-delete personal objectives.
- [x] Add focused unit tests.
- [x] Run focused tests.
- [x] Run TypeScript.
- [x] Run build.
- [x] Capture desktop/mobile screenshots.
- [x] Write final scorecard.

## Promotion gate

Wave 6 can pass only when:

- only collaborator self-capable users can read/write their objectives;
- cross-company reads return nothing;
- only approved catalog keys can be started;
- duplicate active template starts fail closed;
- progress and completion write eligible participation rows;
- no legacy objective, reward, points, badges, ranking or health tables are read
  or written by the new flow;
- DSAR exports personal objectives;
- fulfilled erasure deletes personal objectives and ledger rows;
- build passes;
- desktop and mobile screenshots exist for `/objetivos`.
