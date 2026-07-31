# UniHER Public API Hardening Audit

Date: 2026-07-31
Candidate base: `bb30d75`
Branch: `codex/security-public-api-hardening`
Decision: `HOLD`

## Scope

- Preserve the current landing page without changes.
- Patch vulnerable dependencies without major-version force fixes.
- Close anonymous account escalation and stale-session authorization.
- Minimize the public health response.
- Harden proxy, client IP attribution, and same-origin uploads.
- Probe every implemented `GET` API anonymously with no writes.

## Implemented commits

| Commit | Change |
|---|---|
| `a14c2a3` | Patch vulnerable dependencies and lock the safe transitive versions. |
| `eaaa422` | Restrict public registration to a new RH account with a new company. |
| `4f4e081` | Revalidate persisted user, role, tenant, approval, block, deletion, and company state. |
| `a4ef279` | Return only `healthy` or `degraded` from the public health endpoint. |
| `d21c949` | Close dotted-path and broad auth-prefix bypasses, trust the reverse proxy IP, reject SVG, and enforce upload quota identity. |

## Verification

| Gate | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| Unit tests | 64 passed |
| TypeScript | passed |
| Next production build | passed, 132 pages generated |
| Anonymous runtime probe | 65 of 65 GET routes passed |
| Anonymous protected routes | 62 returned 401 |
| Invalid invite probe | 1 returned 404 |
| Explicit public routes | 2 returned minimal 200 responses |
| Registration escalation probes | both returned 400 |
| Isolated user count before/after probes | unchanged at 1 |

The machine-readable runtime evidence is in
`artifacts/security/public-api-readonly-audit.json`.

## Scanner policy

`npm run test:security:public`:

- discovers every `src/app/api/**/route.ts` that exports `GET`;
- uses only anonymous `GET` requests;
- substitutes non-existent values for dynamic route parameters;
- does not send cookies, bearer tokens, or write methods;
- fails on unexpected 2xx, redirects or ambiguous statuses, 5xx responses,
  request failures, sensitive response keys, or expanded public contracts;
- allows only the minimal health and VAPID-key contracts.

## Remaining hold items

- Verify and reduce health-agenda PII visible to RH and leadership.
- Remove raw invite tokens from authenticated list responses.
- Revoke sessions during administrative password reset and stop returning
  temporary passwords in response bodies.
- Close league and leadership cross-tenant IDOR paths.
- Complete independent review of this candidate.
- Run authenticated role and tenant negative tests in the isolated environment.
- Promote only after review, then repeat the read-only probe against production.

No production deploy was performed in this round.
