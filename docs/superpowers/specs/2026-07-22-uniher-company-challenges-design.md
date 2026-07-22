# UniHER company challenges design

**Wave:** 7
**Scope:** authenticated collaborator `/desafios`
**Status:** approved v1 implementation scope

## Contract

Company challenges are voluntary, company-curated activities that a collaborator
can join, progress, complete or leave for herself. This wave does not expose
individual collaborator progress to RH, leadership, Liga or public rankings.

## Privacy Boundary

- Use only the new `company_challenge` participation source domain.
- Do not read or write legacy `challenges` or `user_challenges` progress.
- Do not write points, badges, level, league, streak, activity log or health
  tables.
- Do not use Semaforo, check-ins, NR-1 answers, exams, agenda, appointments,
  denunciations or health scores as inputs.
- Fulfilled user erasure hard-deletes challenge participation rows and the
  eligible participation events from the same company/user.
- DSAR export includes the new challenge rows plus the existing eligible
  participation ledger.

## V1 Catalog

The first catalog is static and approved in code. Entries are neutral,
non-sensitive and use only these modes:

- `content_items`
- `sessions`
- `days`

Targets must be integers from 1 to 365. Active windows are UTC ISO strings.

## Collaborator States

- `joined`: collaborator opted in and can record progress.
- `completed`: collaborator completed the challenge; progress is 100.
- `left`: collaborator opted out; no penalty or ranking effect.

## Events

| User action | Event | Notes |
| --- | --- | --- |
| Join | `challenge_joined` | One active participation row per catalog item. |
| Progress | `challenge_progressed` | Emitted only when progress increases above 0. |
| Complete | `challenge_completed` | Sets progress to 100. |
| Leave | `challenge_left` | Explicit reversal event, source row stays `left`. |

## Out Of Scope

- RH aggregate management UI.
- Liga scoring or ranking.
- Sensitive wellbeing journeys.
- Legacy challenge migration.
