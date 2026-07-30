# UniHER Safe Parity VPS Deploy Receipt - 1dc0c95

Date: 2026-07-29
Decision: PASS technical deploy, HOLD product/legal/sensitive modules, HOLD merge-to-main

## Scope

- Branch: `codex/uniher-wave3-collaborator-nr1`
- Commit: `1dc0c95 chore: consolidate uniher safe parity recovery`
- PR: `https://github.com/pretinhuu1-boop/uniher/pull/9`
- VPS: Hostinger `srv1373909` / `187.77.42.199`
- App directory: `/var/www/uniher`
- Public URL checked: `https://uniher.com.br`

## Boundaries

- No merge to `main` was performed.
- The public online landing remained frozen. The root page still serves the existing static/Nginx landing with `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`.
- NR-1/Yavix real scoring, clinical Semaforo, Liga/ranking/rewards, SIPAT, Concierge, Canal de Denuncias and Desenvolvimento Humano remain blocked or gated unless a separate source, contract and approval path exists.
- Claude CLI review did not complete in this local session; deterministic tests, build, release preflight and production smoke were used as promotion evidence.

## Local Gates Before Deploy

| Gate | Result |
| --- | --- |
| `npm run test:unit` | PASS, 91 files / 692 tests |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS, 151 routes generated |
| `node --test tests/check-release-env-security.test.cjs` | PASS, 4 tests |
| `git diff --check` | PASS |
| Wave B Playwright gates: `auth-redirect`, `invite-scope`, `rh-user-mutation`, `dashboard-scope`, `collaborator-journey`, `platform-product-boundary` | PASS, 42 tests |
| Frozen landing paths staged/unstaged diff | PASS, no paths |

## GitHub

- Pushed branch: `origin/codex/uniher-wave3-collaborator-nr1`
- Pushed commit: `1dc0c95eb49c68b2418d375618808bfdca44a262`
- Draft PR created: `https://github.com/pretinhuu1-boop/uniher/pull/9`

## Deploy Command

```bash
cd /var/www/uniher
bash deploy/vps/deploy.sh codex/uniher-wave3-collaborator-nr1
```

Result: PASS.

The deploy script completed:

- `git fetch origin`
- checkout/reset to `origin/codex/uniher-wave3-collaborator-nr1`
- `npm ci --include=dev`
- production build
- standalone asset preparation
- migrations
- `npm run check:release-env`
- PM2 restart
- local `/api/health` wait loop

## VPS Evidence

| Check | Result |
| --- | --- |
| Branch | `codex/uniher-wave3-collaborator-nr1` |
| HEAD | `1dc0c95` |
| Worktree | clean against `origin/codex/uniher-wave3-collaborator-nr1` |
| DB backup | `/root/uniher-db-backups/uniher-20260729-193302-pre-1dc0c95.db` |
| Release preflight | PASS 9, HOLD 0, FAIL 0 |
| PM2 | `uniher` online, restarts 0, standalone server ready |
| PM2 logs | no new error lines in `uniher-error-17.log`; out log only Next ready |
| Local health | `{"status":"healthy","timestamp":"..."}` |
| Public health | `{"status":"healthy","timestamp":"..."}` |
| Public root | HTTP 200 static landing, `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT` |

Release preflight details:

```text
PASS JWT_SECRET
PASS JWT_REFRESH_SECRET
PASS UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET
PASS JWT_SECRET_PAIR
PASS NEXT_PUBLIC_APP_URL
PASS COOKIE_SECURITY
PASS ACCESS_TOKEN_BLACKLIST
PASS DATABASE_PATH
PASS SMOKE_ACCOUNTS
Summary: PASS 9, HOLD 0, FAIL 0
```

## Authenticated Smoke

| Actor | Checks | Result |
| --- | --- | --- |
| Admin | `/api/auth/login`, `/api/auth/me` | PASS, login 200, role `admin`, `mustChangePassword=false` |
| RH | `/api/auth/login`, `/api/auth/me`, `/api/company/modules` | PASS, login 200, modules 200 |
| Colaboradora | `/api/auth/login`, `/api/auth/me`, `/api/yavix/copsoq/bootstrap` | PASS, login 200, NR-1 bootstrap 403 expected |

## Decision

PASS for the technical deploy of the safe parity recovery branch to the VPS.

HOLD remains for:

- merge to `main`;
- final human/product approval;
- sensitive modules and clinical/legal/partner scopes;
- any claim that the public landing changed;
- any claim that NR-1/Yavix, clinical Semaforo, Liga/ranking/rewards, SIPAT, Concierge or Denuncias are operational.

## Next Safe Step

Review PR #9 and decide whether to merge the branch into `main`. If merged, rerun the same VPS deploy gate against `main` or intentionally keep production pinned to `codex/uniher-wave3-collaborator-nr1` until product review completes.
