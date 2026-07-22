# UniHER Wave 6 personal objectives design

**Status:** implementation in progress on 2026-07-22
**Scope:** authenticated collaborator self-only route `/objetivos`

## Contract

Wave 6 activates personal objectives without reconnecting legacy gamification.
The collaborator chooses from a fixed approved catalog, records progress
deliberately, completes or archives the objective, and sees only her own rows.

## Data model

- `personal_objectives`
- owner: `company_id` + `user_id`
- status: `active`, `completed`, `archived`
- progress: integer from 0 to 100
- catalog key only; no free-form sensitive objective text in v1
- unique active objective per user/template

## Participation events

The server emits only these eligible events through the Wave 5 ledger:

- `objective_started`
- `objective_progressed`
- `objective_completed`

Source domain is always `personal_objective`. Mutation IDs are deterministic
per objective action, so retries dedupe through the ledger event key.

## Privacy boundaries

- RH, leadership and Admin do not receive individual objective progress.
- Legacy `company_objectives` and `user_objective_progress` remain quarantined.
- Legacy reward claim routes remain unavailable.
- No points, ranking, league, badge or health score is written.
- Personal objectives are included in DSAR exports.
- Fulfilled user erasure hard-deletes personal objectives and participation
  rows in the same delete transaction.

## UI states

The page must cover:

- loading
- unauthorized
- API error
- empty objectives
- active objectives
- completed/archived objectives
- approved catalog with active-template suppression

Desktop and mobile screenshots are required before promotion.
