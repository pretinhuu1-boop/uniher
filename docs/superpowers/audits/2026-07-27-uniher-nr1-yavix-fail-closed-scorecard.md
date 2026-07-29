# UniHER NR-1/Yavix fail-closed scorecard

Date: 2026-07-27
Branch: `codex/uniher-kill-nr1-yavix-gates`
Worktree: `C:\Users\user\Documents\uniher-app-audit\.worktrees\kill-nr1-yavix-gates`
Decision: PASS for safe gate; HOLD for real Yavix/NR-1 promotion.

## Scope

- Intent: keep NR-1/Yavix as a safe blocked gate, not a real integration.
- Allowed: runtime mock gate, entitlement/consent checks, copy that states mock/shell limits, focused tests, docs/spec clarification.
- Denied: real Yavix client, scoring, laudo, CPF/GHE schema, SIPAT, Semaforo, P8 mutations, production promotion, push.

## Gate Rules

- `YAVIX_MOCK=1` is accepted only in `NODE_ENV=development` or `NODE_ENV=test`.
- Production, missing env, typo env, or any non-dev/test runtime must fall into the real path, which is currently blocked with `503`.
- `/avaliacao-nr1` renders only after the canonical NR-1 company entitlement says `enabled`.
- `/api/yavix/copsoq/answer` and `/api/yavix/copsoq/submit` require both company entitlement and active `nr1_psychosocial` consent before any mutation.
- Current copy must not promise laudo, scoring, compliance, GRO/PGR, validated COPSOQ or real Yavix integration.

## Promotion Criteria For Real Integration

- Current Yavix contract/API docs covering server auth or SSO, tenant/company/user mapping, idempotency, rate limits, retention and errors.
- Official result/scoring endpoint or validated scoring matrix with governance approval.
- Approved data model for CPF, GHE, unit, cycle, leadership hierarchy and reconciliation.
- Privacy/legal approval for health-sensitive consent, audit, retention, revocation, DSAR and aggregate reporting.
- Tests proving no token/CPF/answers leak to browser logs, analytics, ranking, Semaforo, Liga or gamification.

## Remaining HOLD

- No real client or provisioning exists.
- No laudo, scoring, GRO/PGR chain or legal compliance evidence exists.
- The mock fixture is not a validated COPSOQ instrument and cannot be used as clinical, occupational or legal output.
