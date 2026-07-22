# UniHER private achievements design

**Wave:** 8
**Scope:** authenticated collaborator `/conquistas`
**Status:** approved v1 implementation scope

## Contract

Private achievements are deterministic milestones derived from non-revoked
eligible participation events. They are visible only to the collaborator.

## Privacy Boundary

- Do not read or write legacy `badges` or `user_badges`.
- Do not expose holder counts, rarity, social sharing, points, ranking or Liga.
- Do not derive achievements from Semaforo, check-ins, NR-1 answers, exams,
  agenda, appointments, denunciations or health scores.
- RH, leadership and company views do not receive individual achievement rows.
- DSAR export includes private achievement rows.
- Fulfilled erasure hard-deletes private achievement rows.

## V1 Achievements

- first personal objective started;
- first personal objective completed;
- first company challenge joined;
- first company challenge completed.

## States

- `in_progress`: no qualifying non-revoked event exists yet.
- `earned`: at least one qualifying non-revoked event exists.
- `revoked`: previously earned milestone no longer has a qualifying
  non-revoked event.

## Out Of Scope

- Legacy badge migration.
- Public sharing.
- Company leaderboard.
- Reward claiming.
