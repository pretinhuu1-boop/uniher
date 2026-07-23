# UniHER Collaborator Placeholder Repair Plan

**Status:** queued after the mobile-shell wave

**Scope:** `/semaforo`, `/objetivos`, `/desafios`, `/conquistas`, and `/liga`

## Guardrail

The current review/feedback states are intentional containment. This plan does not reconnect the old gamification or health-derived endpoints without a reviewed contract. A route only leaves `placeholder` after its data source, privacy policy, permission boundary, loading/error states, and focused tests exist.

## Order and gates

1. **Semaforo:** define a personal, collaborator-only status model. Confirm whether the status is self-reported, content-derived, or another approved source. It must not expose clinical inference, individual NR-1 answers, score, or classification. Ship only after consent/copy and API tests pass.
2. **Objetivos:** define objective ownership, lifecycle, progress, archive behavior, and empty states. Progress must come from a typed source and must not silently become points, rank, or health scoring.
3. **Desafios:** define company-curated challenge content, eligibility, completion, recurrence, and accessibility. Keep completion separate from check-in and NR-1 response data.
4. **Conquistas:** define the achievement ledger, non-sensitive event vocabulary, deduplication, revocation, and visibility policy. Do not display badges sourced from quarantined health or ranking data.
5. **Liga:** keep blocked until cohort membership, eligibility, ranking calculation, consent, anti-identification, and company policy are approved. The first implementation may be an honest unavailable state, not a simulated leaderboard.

## Shared acceptance criteria

- Every read and write is scoped to the authenticated user/company contract.
- No route exposes check-ins, semaforo details, NR-1 answers, scores, classifications, or mental-health inference to RH, leadership, community, or ranking surfaces.
- Each route has real loading, empty, error, unavailable, and success states.
- Desktop and mobile screenshots are captured from the real route at representative dimensions.
- Focus, keyboard navigation, reduced motion, contrast, touch targets, and horizontal overflow are independently checked.
- Unit tests cover policy and mapping; browser tests cover permission and boundary cases.

## First executable slice

Start with a pre-wave audit of the current route components, APIs, schemas, and tests. Then write the semaforo contract before changing its UI. Do not open implementation work for the other four routes until the semaforo decision is recorded, because objectives, challenges, achievements, and league behavior depend on whether the platform has a safe personal-status primitive.
