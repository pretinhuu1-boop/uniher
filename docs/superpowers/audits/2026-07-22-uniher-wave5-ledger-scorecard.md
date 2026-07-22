# UniHER Wave 5 ledger scorecard

**Date:** 2026-07-22
**Lane:** `wave5-ledger`
**Decision:** PASS for foundation implementation

## Scope delivered

- Conservative v1 decision recorded.
- Migration 056 creates the eligible participation ledger, revocation tombstones
  and count-only erasure receipts.
- Event allowlist and source mapping are immutable in TypeScript and enforced in
  SQLite checks.
- Metadata is disabled in v1.
- Repository supports idempotent insert, self/company reads, tombstone
  revocation and hard-delete erasure receipts.
- Service exposes only named transaction-scoped internal writers for
  objective/challenge events.
- DSAR export includes live and revoked eligible participation rows.
- Fulfilled Admin/RH user deletion hard-deletes participation rows and writes
  the count-only receipt in the same transaction as `deleted_at`.
- `content_completed` remains without a service writer until a future domain
  mutation can share one transaction.

## Privacy checks

PASS:

- arbitrary event names fail closed;
- forbidden sources fail closed;
- mismatched source domains fail closed;
- metadata keys fail closed;
- duplicate `event_key` retry returns the same row;
- new `mutation_id` creates a new row;
- cross-company reads return nothing;
- revocation uses a tombstone and does not edit the event row;
- default reads exclude revoked events;
- hard-delete removes events and tombstones;
- erasure receipt keeps only company, actor, event count and timestamp;
- DSAR exports ledger events and revocations without internal cursor fields;
- Admin/RH fulfilled user deletion paths call the ledger hard-delete helper;
- the service does not export queue-isolated objective/challenge writers;
- legacy points, levels, badges, leagues and `health_scores` are not mutated.

## Validation

- `npm run test:unit -- tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts`
  - PASS: 3 files, 34 tests.
- `npm run test:unit -- tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/gamification-quarantine-migration.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/gamification-openapi-containment.test.ts tests/unit/privacy/home-gamification-reachability.test.ts tests/unit/privacy/semaforo-containment.test.ts`
  - PASS before DSAR hardening: 7 files, 71 tests.
- `npm run test:unit -- tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/privacy/gamification-quarantine-migration.test.ts tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/gamification-openapi-containment.test.ts tests/unit/privacy/home-gamification-reachability.test.ts tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/dsar-stable-pagination.test.ts`
  - PASS after DSAR hardening: 8 files, 75 tests.
- `npx tsc --noEmit`
  - PASS.
- `npm run build`
  - PASS: 137 routes.
  - Known warnings: Turbopack/NFT tracing warnings from `next.config.ts` through
    `src/app/api/admin/system/ops/route.ts` and instrumentation output.

## Screenshots

Not applicable for Wave 5. This wave adds backend foundation only and does not
activate or visually change `/objetivos`, `/desafios`, `/conquistas`, `/liga`
or Semaforo behavior. The existing visual-contained wave screenshots remain the
visual evidence for those pages.

## Remaining gates

- Wave 6 may now start for personal objectives.
- Wave 7 may now start for company challenges.
- Wave 8 waits until Wave 6 and Wave 7 contracts are stable.
- Semaforo remains separate and decision-gated.
- Liga remains blocked until policy approval and Waves 5 and 8 are promoted.
- Scheduled retention cleanup is not enabled in Wave 5; it needs a separate job
  spec before automatic expiry deletion.

## Staging note

Do not stage with `git add .`. The worktree also contains the prior visual wave,
orchestration docs and a pre-existing Yavix research file. Stage Wave 5 with an
explicit allowlist only.
