# UniHER Wave 5 ledger preflight

**Date:** 2026-07-22
**Lane:** `wave5-ledger`
**Decision:** BLOCKED for mutable implementation

## Source of truth

- `docs/superpowers/specs/2026-07-21-uniher-waves5-10-decision-packet.md`
- `docs/superpowers/plans/2026-07-21-uniher-pending-surfaces-orchestration.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

## Preflight result

Wave 5 cannot open migration, repository, service, schema, or writer code yet.

The decision packet is explicit:

- status is pending explicit product/privacy approval;
- before approval, the effect is documentation only;
- no ledger, objective, challenge, achievement, Semaforo or Liga data model is activated;
- no migration 056 may be created until retention, erasure, count-only audit receipt, and deletion owner are approved.

Because this packet is the stricter source, it overrides the implementation file list in the orchestration plan.

## Current code state

Observed containment:

- `src/app/api/objectives/route.ts` returns `privacyReviewResponse()`.
- `src/app/api/objectives/[id]/claim/route.ts` returns `privacyReviewResponse()`.
- `src/app/api/collaborator/challenges/route.ts` returns `privacyReviewResponse()`.
- `src/app/api/collaborator/challenges/[id]/route.ts` returns `privacyReviewResponse()`.
- `src/app/api/collaborator/badges/route.ts` returns `privacyReviewResponse()`.
- `src/app/api/badges/route.ts` returns `privacyReviewResponse()`.
- RH objectives, challenges and leagues routes also return `privacyReviewResponse()`.
- `src/services/objectives.service.ts` and `src/services/league.service.ts` fail closed through `legacyGamificationUnavailable()`.

Observed legacy/quarantine state:

- migration 049 quarantines legacy leagues, badges, missions, activity log, user score fields and health-derived rows.
- migration 055 quarantines legacy objectives and challenges.
- latest migration is 055; no `056_eligible_participation_ledger.sql` exists.

## Required approvals before code

- DPO/legal chooses the participation expiry window.
- DPO/legal approves hard deletion or documents a keyed-HMAC exception and key-destruction procedure.
- DPO/legal approves the count-only audit receipt and its retention window.
- Product names the operational owner for deletion requests.
- Product approves `challenge_left` as the explicit participation reversal.
- Product approves achievement tombstones instead of deleting history.
- Product approves objective units, limits and archive semantics.
- Product approves challenge modes, limits and aggregate visibility.
- Product approves private achievement states and `/api/collaborator/achievements`.

## Allowed next work

Only documentation and orchestration can move before approval:

- keep `/objetivos`, `/desafios`, `/conquistas`, `/liga` and Semaforo visually contained;
- prepare the Wave 5 harness contract and worker prompt;
- prepare a red-test plan, but do not add tests that imply an approved data model;
- do not create migration 056 or any production ledger API/service/repository.

## Promotion recommendation

Hold Wave 5 as `decision-gated`. Continue visual/design work only where it preserves containment and does not imply functional activation.
