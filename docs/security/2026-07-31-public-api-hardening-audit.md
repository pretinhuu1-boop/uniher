# UniHER Public API Hardening Audit

Date: 2026-07-31
Production base: `bb30d75`
Candidate branch: `codex/security-public-api-hardening`
Candidate code commit: `ec81a14`
Deployed commit: `201586f`
Decision: `PASS_PRODUCTION`

## Scope

- Preserve the current landing page.
- Find public APIs that expose private or operational data.
- Close anonymous privilege escalation and stale authorization.
- Enforce tenant and department boundaries in reads and writes.
- Make password reset, first access, refresh rotation and invite acceptance safe.
- Harden uploads, client IP attribution, caching and dependency vulnerabilities.
- Validate behavior with isolated runtime probes, E2E flows and screenshots.

## Controls Implemented

- Public registration only creates a new RH account with a new company.
- Authenticated requests reload persisted user, role, tenant and account state.
- Access tokens carry `session_version`; password changes and resets revoke old access.
- Refresh tokens carry a unique `jti`, have a unique persisted hash and rotate atomically.
- The write queue no longer replays failed writes unless explicitly requested.
- Administrative and public reset links, plus individual and batch invite links, require
  the trusted HTTPS UniHER origin in production.
- Invite acceptance atomically creates the account, consumes the invite and stores the
  refresh token.
- Invite and RH user department writes revalidate `company_id` inside the transaction.
- Legacy duplicate refresh hashes are deduplicated before the unique index migration.
- Campaign joining and challenge completion award points atomically and idempotently.
- Production deploys run migrations without executing development seed data.
- Development seed data creates reference records only, with no account or credential.
- Historical credentials were removed from every tracked file, including local Claude
  command history, and a policy test scans the full `git ls-files` set.
- E2E, legacy penetration and visual security suites require credentials from the
  environment and reject remote authenticated targets unless explicitly approved.
- Agenda aggregates require a cohort of five and five distinct contributors.
- Leadership invite data is department-scoped, read-only and contains no raw token.
- Public invite validation masks the email address.
- Uploads enforce trusted types, WebP signatures, quota reservation and retry-safe
  compensation.
- Health returns only `healthy` or `degraded`.
- Protected navigation and API responses are not cached publicly.
- Nginx templates overwrite forwarded client headers with the direct proxy address.

## Final Local Evidence

| Gate | Result |
|---|---|
| Unit tests | 50 files, 256 tests passed |
| TypeScript | `npx tsc --noEmit` passed |
| Production build | passed, 132 routes generated |
| Dependency audit | 0 vulnerabilities |
| Anonymous GET scanner | 65 of 65 routes passed |
| Isolated method probes | 10 of 10 passed |
| Database invariant | `PASS_ISOLATED_DATABASE_BOUND_AND_INVARIANT` |
| Fresh database migration | 49 application tables; integrity OK; zero foreign-key violations |
| Auth/tenant/security E2E | 131 of 131 passed, including 21 visual UX cases |
| Visual security audit | passed on desktop and mobile; no console errors |
| Landing source | page, layout and global CSS blobs unchanged from `bb30d75` |

Machine-readable evidence:

- `artifacts/security/public-api-readonly-audit.json`
- `artifacts/security/visual-security-audit.json`
- `artifacts/security/screenshots/agenda-manager-suppressed.png`
- `artifacts/security/screenshots/agenda-manager-suppressed-mobile.png`
- `artifacts/security/screenshots/invites-rh-token-controls.png`
- `artifacts/security/screenshots/invites-leadership-redacted.png`

## Review History

- Earlier independent review waves returned `HOLD`; their authorization, tenant,
  invite, upload, refresh, seed and concurrency findings were fixed and retested.
- Claude final review of `2026f49`: `PASS`, no P0/P1.
- Independent review of `2026f49`: `HOLD` because the retired production credential
  remained in tests; fixed in `c3412f5`.
- Independent review of `c3412f5`: `HOLD` because tracked Claude command history and
  the visual audit still held credentials or allowed an unapproved remote target;
  fixed in `3aa8db3`.
- Final independent review of `ec81a14`: `PASS`, no P0/P1.
- Final Claude review of `ec81a14`: `PASS`, no P0/P1.

## Production Evidence

- Online backup: `/var/backups/uniher-security-20260731-114505`.
- Post-rotation backup used for deployment:
  `/var/backups/uniher-security-post-rotation-20260731-122507`.
- Backup integrity: `ok`; permissions `0700` for the directory and `0600` for the
  database and environment copy.
- The historical Master Admin password was rotated through the authenticated flow;
  old login returns `401`, while new login, `/api/auth/me` and logout return `200`.
- A bcrypt comparison of all nine production users initially found four additional
  demo accounts using the retired password. All four were rotated, their refresh
  tokens were deleted, and the repeated comparison returned zero matches.
- The pre-deploy backup contains five legacy foreign-key violations. Candidate
  migration `071_repair_challenge_archetype_ids.sql` repaired them; production now
  reports integrity `ok`, zero foreign-key violations and 68 preserved tables.
- Migration `070_security_session_version.sql` is live. Session versions were
  incremented for all five rotated accounts and their refresh-token count is zero.
- All five secured accounts passed fresh login, `/api/auth/me` and logout requests.
- Anonymous production audit: 65 of 65 GET routes passed; write probes were disabled.
- PM2 is online on commit `201586f`; the process listens only on
  `127.0.0.1:3000`, and external port 3000 is unreachable.
- Both active Nginx configurations overwrite `X-Forwarded-For` with `$remote_addr`;
  `nginx -t` passed and HTTPS health returns only `{"status":"healthy"}`.
- Landing, mobile landing and auth screenshots returned 200 with no console errors.
  Anonymous `/semaforo` redirected to `/auth?redirect=%2Fsemaforo`.

Production artifacts:

- `artifacts/security/public-api-production-audit.json`
- `artifacts/security/production-visual-smoke.json`
- `artifacts/security/screenshots/production-landing-20260731.png`
- `artifacts/security/screenshots/production-landing-mobile-20260731.png`
- `artifacts/security/screenshots/production-auth-20260731.png`

## Promotion Policy

- Push the candidate branch first.
- Fast-forward only `feat/yavix-copsoq-scaffold`, currently based on `bb30d75`.
- Do not push or merge the unrelated `main` branch.
- Back up the production database, environment and active Nginx files.
- Verify `NEXT_PUBLIC_APP_URL=https://uniher.com.br`, run `nginx -t`, build, restart
  PM2 and verify the listener remains bound to `127.0.0.1:3000`.
- Run only anonymous GET probes and authenticated read-only smoke tests in production.

## Residual Risk

- The build emits the existing Next.js NFT dynamic-trace warning for
  `src/app/api/admin/system/ops/route.ts`.
- Claude recorded three non-blocking P2 observations: soft-deleted users remain visible
  to Master Admin, one objective side-effect does not await its queue promise, and the
  development-only guard accepts an optional request but fails closed.
- Retired credentials remain visible in historical Git objects even though they are
  absent from the current tree and no production password hash matches them. Rewriting
  shared history is deferred because it requires a coordinated force-push and fresh clones.
- Nginx still emits the existing duplicate protocol-options warning for `[::]:443`.
- The VPS filesystem remains at approximately 90% usage and should be cleaned in a
  separate operational maintenance window.
