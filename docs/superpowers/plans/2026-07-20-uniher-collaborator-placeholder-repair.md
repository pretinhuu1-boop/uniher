# UniHER Collaborator Placeholder Repair Plan

**Status:** superseded as an execution order by `2026-07-21-uniher-pending-surfaces-orchestration.md`; retained as the original guardrail record

**Scope:** `/semaforo`, `/objetivos`, `/desafios`, `/conquistas`, and `/liga`

## Guardrail

The current review/feedback states are intentional containment. This plan does not reconnect the old gamification or health-derived endpoints without a reviewed contract. A route only leaves `placeholder` after its data source, privacy policy, permission boundary, loading/error states, and focused tests exist.

## Revised order and gates

1. **Eligible participation ledger:** create a new point-free, server-validated event foundation. Do not reuse quarantined points, badges, league rows, activity logs, mission logs, objective progress, challenge progress, or health scores.
2. **Objetivos:** implement self-owned objectives over the eligible ledger. Progress is private and cannot become points, rank, health scoring, or an RH individual view.
3. **Desafios:** implement company-curated, voluntary challenges over the eligible ledger. Keep completion separate from check-in, Semaforo, NR-1, exams, appointments, and care data.
4. **Conquistas:** derive private achievements only from the eligible event vocabulary. Do not display legacy badges, holder counts, rarity, public sharing, or employer leaderboards.
5. **Semaforo:** run as a separate self-care wave after source, consent, retention, deletion, and non-diagnostic copy are approved. It is not a prerequisite or input for Objectives, Challenges, or Achievements.
6. **Liga:** keep blocked until cohort membership, eligible scoring, opt-in, tenant isolation, anti-identification, and product/legal policy are approved. Do not ship a simulated leaderboard.

## Shared acceptance criteria

- Every read and write is scoped to the authenticated user/company contract.
- No route exposes check-ins, semaforo details, NR-1 answers, scores, classifications, or mental-health inference to RH, leadership, community, or ranking surfaces.
- Each route has real loading, empty, error, unavailable, and success states.
- Desktop and mobile screenshots are captured from the real route at representative dimensions.
- Focus, keyboard navigation, reduced motion, contrast, touch targets, and horizontal overflow are independently checked.
- Unit tests cover policy and mapping; browser tests cover permission and boundary cases.

## First executable slice

Start with the company Community feed using `2026-07-20-uniher-company-community-feed.md`. Then write and approve the eligible participation ledger spec before changing Objectives, Challenges, or Achievements. Semaforo proceeds independently after its product/privacy decision; Liga remains last.
