# UniHER Wave 5 eligible participation ledger plan

**Status:** implementation opened on 2026-07-22
**Write set:**

- `docs/superpowers/specs/2026-07-21-uniher-eligible-participation-ledger-design.md`
- `docs/superpowers/plans/2026-07-21-uniher-eligible-participation-ledger.md`
- `src/lib/db/migrations/056_eligible_participation_ledger.sql`
- `src/types/participation.ts`
- `src/lib/participation/eligibility.ts`
- `src/lib/participation/schemas.ts`
- `src/repositories/participation.repository.ts`
- `src/services/participation.service.ts`
- `tests/unit/participation-eligibility.test.ts`
- `tests/unit/participation-repository.test.ts`

## Harness contract

- Intent source: operator approved the recommended conservative v1.
- Lane: `wave5-ledger`.
- Allowlist: files listed in this plan plus orchestration docs and scorecard.
- Denylist: platform pages, public landing, RH/Yavix/NR-1 work, legacy
  gamification writers, Semaforo, Liga ranking, email/metadata work.
- Preflight: branch `codex/uniher-wave3-collaborator-nr1`, latest migration 055,
  visual wave uncommitted and preserved.
- Evidence: focused unit tests, privacy containment tests, typecheck, build,
  diff check and scorecard.
- Stop conditions: any need to reconnect legacy points, rankings, health,
  badges, check-in, agenda or Semaforo data.

## Execution checklist

- [x] Record conservative v1 product/privacy decision.
- [x] Add migration 056 with event, revocation and erasure receipt tables.
- [x] Add immutable event allowlist and forbidden source policy.
- [x] Add metadata-disabled schemas.
- [x] Add repository with idempotent insert, self/company read, revocation and
  hard-delete receipt.
- [x] Add service with named transaction-scoped internal writers only.
- [x] Add DSAR export of live and revoked participation rows.
- [x] Wire fulfilled Admin/RH user deletion to ledger hard-delete receipts.
- [x] Add focused unit tests for eligibility and repository behavior.
- [x] Run focused tests.
- [x] Run gamification and Semaforo containment regressions.
- [x] Run TypeScript.
- [x] Run build.
- [x] Write final Wave 5 scorecard.

## Promotion gate

Wave 5 may pass only when:

- duplicate `event_key` writes are idempotent;
- new `mutation_id` writes produce a new row;
- cross-company reads return nothing;
- forbidden sources and metadata fail closed;
- revocation uses tombstones;
- erasure receipts are count-only;
- DSAR exports live and revoked ledger rows;
- fulfilled Admin/RH deletion hard-deletes ledger rows in the same transaction
  as the user `deleted_at` update;
- legacy points, levels, badges, leagues and `health_scores` are untouched;
- existing privacy containment suites still pass.
