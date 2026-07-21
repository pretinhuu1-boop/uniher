# UniHER Waves 5-10 decision packet

**Status:** pending explicit product/privacy approval  
**Scope:** authenticated internal platform  
**Effect before approval:** documentation only; no ledger, objective, challenge,
achievement, Semaforo or Liga data model is activated by this packet.

## Decision A - participation retention and erasure

**Recommended contract**

- Store only server-derived participation events from the fixed allowlist.
- Keep no free-form metadata in the first release.
- Retain an event only while it is necessary for an active objective, challenge
  or achievement plus an approved expiry window.
- On fulfilled account erasure, hard-delete every event linked to the user in
  the same operation. If legal requires a pseudonymized exception, it must use
  a keyed HMAC with a per-user key that is destroyed or rekeyed on erasure;
  plain deterministic hashes such as SHA-256 are forbidden for this purpose.
- Keep only a count-only erasure receipt with actor, company, event count and
  timestamp. The receipt must not retain the removed user ID, source ID or event
  key.
- Include all live and revoked participation data in the user's DSAR export.

**Approval required**

- [ ] DPO/legal chooses the expiry window.
- [ ] DPO/legal approves hard deletion or documents the keyed-HMAC exception
  and its key-destruction procedure.
- [ ] DPO/legal approves the count-only audit receipt and its retention window.
- [ ] Product names the operational owner that fulfills deletion requests.

No migration 056 may be created until all four items are approved.

## Decision B - event provenance and lifecycle

**Recommended fixed mapping**

| Event | Source domain | Producer state |
| --- | --- | --- |
| `content_completed` | `content` | Disabled until daily lesson completion is moved into the same transaction |
| `objective_started` | `personal_objective` | Created by Wave 6 only |
| `objective_progressed` | `personal_objective` | Created by Wave 6 only |
| `objective_completed` | `personal_objective` | Created by Wave 6 only |
| `challenge_joined` | `company_challenge` | Created by Wave 7 only |
| `challenge_progressed` | `company_challenge` | Created by Wave 7 only |
| `challenge_completed` | `company_challenge` | Created by Wave 7 only |
| `challenge_left` | `company_challenge` | Append-only reversal created by Wave 7 |

`event_key` is a versioned SHA-256 digest derived on the server from event
version, company, user, event type, source domain, immutable source ID and an
immutable `mutation_id`. A retry reuses the same `mutation_id`; every new
progress mutation receives a new one, so idempotency never collapses valid
progress. Each producer uses a dedicated internal method; no generic public
`recordEvent` method is allowed. Insert and domain mutation share one
`IMMEDIATE` transaction. A unique `event_key` makes only the same mutation
retry idempotent. This digest is deleted with the event and must never be used
as the pseudonymization mechanism described in Decision A.

Achievement evaluation is deterministic over non-revoked eligible events.
Revocation creates a versioned tombstone with a reason code and count-only audit
receipt; it never edits historical source events in place.

**Approval required**

- [ ] Product approves `challenge_left` as the explicit participation reversal.
- [ ] Product approves achievement tombstones instead of deleting history.

## Decision C - catalogs and progress semantics

**Recommended objective v1**

- Personal, self-started templates only.
- Units: `content_items`, `sessions`, `days`.
- Integer target from 1 to 365; progress is monotonic and capped at target.
- One active instance per template version and user.
- Archive is personal and reversible; completion is not reward claim.
- No employer assignment, points, badges, streaks, health, ranking or sharing.

**Recommended challenge v1**

- Company-authored catalog; collaborator join and leave are voluntary.
- Modes: `content_items`, `sessions`, `days` only.
- Integer target from 1 to 365 and explicit UTC start/end timestamps.
- RH sees catalog state and privacy-suppressed aggregate participation only,
  never names or individual progress.
- No health/NR-1/check-in/exam/agenda source and no points or ranking.

**Recommended achievement v1**

- Private deterministic milestones derived only from the approved event map.
- States: `in_progress`, `earned`, `revoked`.
- No rarity, holder counts, points, public share or company leaderboard.
- New endpoint is `/api/collaborator/achievements`; legacy `/badges` remains 410.

**Approval required**

- [ ] Product approves objective units, limits and archive semantics.
- [ ] Product approves challenge modes, limits and aggregate visibility.
- [ ] Product approves the private achievement states and new endpoint.

## Decision D - Semaforo

Wave 9 may open only if all items are approved:

- [ ] Self-report only, self-visible only and explicitly non-diagnostic.
- [ ] Labels and copy reviewed by clinical/product owners.
- [ ] Consent, retention and deletion policy approved.
- [ ] No manager, RH, leadership or company escalation path.
- [ ] No use as an objective, challenge, achievement or Liga input.

Until then, the collaborator placeholder and fail-closed APIs remain; RH and
leadership navigation remains absent.

## Decision E - Liga

Wave 10 stays hard blocked until legal/product chooses one model:

- **Recommended:** private collective participation bands, with cohort
  suppression and no named rank.
- **Alternative:** named individual ranking. This requires a separate labor,
  discrimination, consent, revocation and data-subject-rights assessment and is
  not approved by this packet.

Required choices:

- [ ] Collective bands or named ranking.
- [ ] Eligible event set and scoring formula.
- [ ] Minimum cohort and complementary suppression policy.
- [ ] Pseudonym, opt-in, revocation and DSAR behavior.
- [ ] Labor/legal approval and accountable owner.

No Liga route, navigation item or legacy writer may be activated before all
choices are approved and Waves 5 and 8 have passed.
