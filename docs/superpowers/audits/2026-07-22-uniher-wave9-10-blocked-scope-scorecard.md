# UniHER Wave 9-10 blocked scope scorecard

**Date:** 2026-07-22
**Lanes:** `wave9-semaforo`, `wave10-liga`
**Status:** PASS blocked/contained

## Semaforo

Decision: remains blocked for production behavior.

Evidence:

- `/semaforo` renders contained visual copy from `SEMAFORO_REVIEW_STATE`.
- `GET /api/collaborator/semaforo` returns review state only.
- `GET /api/collaborator/semaforo/history` returns review state only.
- `POST /api/collaborator/semaforo/recalculate` returns review state with
  status `423`.
- Semaforo calculator and health-score repository remain fail-closed through
  `SemaforoContainmentError`.

No production activation found:

- no new self-report storage;
- no diagnosis;
- no RH/company/leadership individual access;
- no feed into objectives, challenges, achievements, Liga, NR-1 or Yavix.

## Liga

Decision: remains blocked for production behavior.

Evidence:

- `/liga` renders contained visual copy from `LEGACY_GAMIFICATION_STATE`.
- `GET /api/collaborator/leagues` returns `privacyReviewResponse()`.
- legacy `league.service.ts` remains fail-closed.
- Wave 7 and Wave 8 do not write `user_leagues`,
  `custom_league_members`, points or named ranking rows.

No production activation found:

- no named ranking;
- no collective bands;
- no scoring formula;
- no legacy points/badges/health sources promoted.

## Residual Decision Gates

Semaforo remains blocked until clinical/product/DPO/SST decisions approve:

- self-report copy and non-diagnostic labels;
- consent;
- retention;
- deletion;
- audience;
- prohibition from downstream gamification/ranking inputs.

Liga remains blocked until product/legal decisions approve:

- collective bands versus named ranking;
- scoring formula;
- minimum cohort and suppression policy;
- opt-in/revocation;
- DSAR behavior;
- labor/legal accountable owner.

## Promotion Recommendation

Promote only the contained visual pages and blocked-scope scorecard. Do not
activate production Semaforo or Liga behavior in this redesign wave.
