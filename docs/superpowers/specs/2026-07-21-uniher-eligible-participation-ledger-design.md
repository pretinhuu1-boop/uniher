# UniHER eligible participation ledger design

**Status:** approved for Wave 5 implementation
**Approval basis:** 2026-07-22 operator decision to proceed with the recommended conservative v1
**Scope:** authenticated internal platform only

## Product contract

Wave 5 creates the privacy-safe participation foundation used later by
Objectives, Challenges and Achievements. It does not activate `/objetivos`,
`/desafios`, `/conquistas` or `/liga` UI behavior by itself.

The v1 contract is conservative:

- hard-delete participation events on fulfilled user erasure;
- no free-form event metadata;
- no points, ranking, levels, rarity or public sharing;
- no Semaforo, NR-1, check-in, mood, health, exam, appointment, psychology,
  denunciation, agenda, legacy badge or legacy league source;
- only server-derived, explicit, voluntary participation events;
- count-only erasure receipts with actor, company, event count and timestamp.

## Event allowlist

```ts
content_completed
objective_started
objective_progressed
objective_completed
challenge_joined
challenge_progressed
challenge_completed
challenge_left
```

`content_completed` remains without a service writer until daily lesson
completion can write the domain mutation and ledger event in one transaction.

## Source mapping

| Event | Source domain | Producer |
| --- | --- | --- |
| `content_completed` | `content` | disabled in Wave 5 |
| `objective_started` | `personal_objective` | Wave 6 only |
| `objective_progressed` | `personal_objective` | Wave 6 only |
| `objective_completed` | `personal_objective` | Wave 6 only |
| `challenge_joined` | `company_challenge` | Wave 7 only |
| `challenge_progressed` | `company_challenge` | Wave 7 only |
| `challenge_completed` | `company_challenge` | Wave 7 only |
| `challenge_left` | `company_challenge` | Wave 7 explicit reversal |

## Persistence

Migration 056 creates:

- `eligible_participation_events`
- `eligible_participation_event_revocations`
- `participation_erasure_receipts`

The event row persists:

- `id`
- `event_key`
- `mutation_id`
- `company_id`
- `user_id`
- `event_type`
- `source_domain`
- `source_id`
- `eligibility_version`
- `metadata_json`
- `occurred_at`
- `created_at`

`metadata_json` is constrained to `{}` in v1.

## Idempotency

`event_key` is a SHA-256 digest derived on the server from:

- eligibility version;
- company;
- user;
- event type;
- source domain;
- immutable source ID;
- immutable mutation ID.

A retry reuses the same `mutation_id` and returns the existing row. A new
progress mutation uses a new `mutation_id` and creates a second row.

## Revocation

Revocation writes a tombstone row in
`eligible_participation_event_revocations`; it does not edit the event row.
Default reads exclude revoked events. DSAR-oriented reads may include events and
tombstones until hard-delete.

## Erasure

Fulfilled user erasure hard-deletes that user's ledger events and cascaded
tombstones. The only retained receipt stores:

- company ID;
- actor ID;
- event count;
- erased timestamp.

It does not retain removed user ID, source ID, event key or mutation ID.

## Retention

V1 uses a 90-day post-close retention target after the related objective,
challenge or achievement lifecycle no longer needs the event. Enforcement jobs
are outside Wave 5 and must be specified before scheduled deletion is enabled.

## Non-goals

- no route activation;
- no client-submitted arbitrary event;
- no generic exported `recordEvent`;
- no Liga scoring;
- no legacy migration from quarantined gamification data.
