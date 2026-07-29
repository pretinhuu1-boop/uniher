# UniHER full gap map after main merge

Date: 2026-07-29
Coordinator checkout: `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`
Mode: multi-agent read-only audit plus coordinator consolidation; only this map was added.

## Executive decision

The old platform was not broadly lost at the route/API file level. The recovery branch was merged into `main`.

The real problem is more specific:

- The current code preserves and expands the old surface structurally.
- Several important workflows were rewritten and need semantic regression validation.
- Some old "complete" promises were intentionally removed or quarantined for privacy/security, especially public gamification/ranking/rewards.
- Several visually polished modules are still shells or contract-gated surfaces, not operational products.
- Production remains HOLD until the host/runtime gate is proven with current target evidence.

## Source of truth

| Item | Current evidence | Decision |
| --- | --- | --- |
| Old baseline before one month ago | `9ca4bd8d9d60c25a0b116d8ded0009cff831a551`, 2026-04-04, `feat: add guided first access flow` | Use only as preservation baseline, not as rollback target. |
| Recovery source branch | `codex/uniher-wave3-collaborator-nr1` at `0fb1d517d9ce91cdab1db3703f33f2611d31abfa` | Current recovered source after DSAR/mobile fixes and Claude review. |
| Main after recovery | `origin/main` at `ddcb7f41952a3febac127734544b3f74387585d9`, PR #7 merge commit | Main contains the recovery tree. |
| Tree comparison | `git diff --quiet HEAD origin/main` -> `TREE_DIFF_HEAD_ORIGIN_MAIN=NONE` | Merge commit changes history, not content. |
| Prior docs saying `d26ef70` is current | Stale after later commits `2ec7bab`, `7b238dd`, `8bd5efc`, `0fb1d51` | Treat `d26ef70` as historical pre-fix candidate only. |

## Agent lanes

| Lane | Scope | Decision |
| --- | --- | --- |
| Baseline diff | `9ca4bd8` vs `origin/main` route/API preservation | No old `src/app` route removals found; high semantic-change risk. |
| Auth/tenant/privacy/security | API contracts, DSAR, upload, session, tenant | No P0; local P1/P2 repairs are now covered by WB-03, WB-06, WB-07, WB-08, WB-09 and WB-11. Production still needs host/runtime gates. |
| Product/module map | Admin/RH/Lideranca/Colaboradora plus sensitive modules | Core platform usable in parts; several polished modules are shells/HOLD. |
| DB/deploy/runtime | migrations, env, PM2/Nginx/Docker, health, backup | Local/homologation instrumented; production HOLD. |
| Visual/navigation | sidebar, smoke, screenshots, route coverage | PASS technical visual smoke; HOLD human approval and shell modules. |
| Docs/tests consistency | overclaims, stale scorecards, contradictory gates | No P0; docs need correction labels and current source-of-truth. |

## What is usable now

These areas have real code paths, APIs, or tests and can be treated as usable for controlled demo/homologation, with the limits noted.

| Area | Usable status | Evidence | Limit |
| --- | --- | --- | --- |
| Auth/session/login/logout/refresh | Usable with hardening | `src/lib/auth/middleware.ts`, `src/services/auth.service.ts`, auth routes | Needs production blacklist SQLite gate. |
| Admin master basics | Usable | `src/app/(platform)/admin/page.tsx`, `/api/admin/*` | WB-20 removed dead legacy badge CRUD and blocks legacy gamification alert sends; some audit fields still use `actorEmail` with user id semantics. |
| RH company operations | Usable partial | RH users, departments, invites, company profile, CSV import routes | Need focused workflow validation after rewrites. |
| Employee CSV import | Usable partial | `src/lib/employee-import/*`, `/api/rh/employees/import-*`, tests | WB-07 fixed imported identity DSAR fallback/linkage locally; XLSX/import expansion remains a separate future scope. |
| Colaboradora home | Usable partial | `src/app/(platform)/colaboradora/page.tsx`, `/api/collaborator/*` | High semantic-change area; needs journey smoke against old expected behavior. |
| Agenda pessoal | Usable for colaboradora | `/agenda`, `/api/collaborator/agenda*`, agenda tests | Not a full RH-managed health operations module. |
| Bem-estar privado | Usable | `/api/wellbeing/*`, dashboard aggregate service | Aggregates only; no individual mood exposure promise. |
| Semaforo pessoal | Usable limited | `/semaforo`, `/api/collaborator/semaforo*` | Self-report only; no clinical/diagnostic Semaforo. |
| Comunidade | Usable with limits | `/comunidade`, `/comunidade/gerenciar`, community APIs | Editorial/simple content, not full education CMS. |
| Campanhas | Usable partial | `/campanhas`, `/api/campaigns*`, collaborator campaign APIs | Not a complete CMS/training engine. |
| Objetivos/Desafios/Conquistas privadas | Usable mainly for colaboradora | personal objectives, company challenges, private achievements tests | RH management and public gamification remain constrained. |
| Visual/navigation shell | Technically strong with product-boundary canaries | `visual-ux-smoke-latest`: 192/192 PASS, 4 viewports, sidebar issues `[]`; WB-19 `platform-product-boundary`: 14/14 PASS | Still not human visual approval and not production approval. |

## What is missing or intentionally not operational

These are the places where the feeling that "a lot is missing" is valid.

| Area | Current state | Why it feels missing | Where it enters |
| --- | --- | --- | --- |
| Classic gamification | Contained/quarantined | Old material promised XP, streaks, shared badges, leaderboard, leagues and rewards; current APIs return privacy review/410 in several paths. | Product/legal decision first, then rebuild with opt-in, privacy suppression, audit, tests. |
| RH objectives/challenges/leagues management | In review/partial | Old HTML/test surfaces suggested RH-managed objectives, challenges and leagues; current routes are constrained. | Dedicated product wave after privacy contract. |
| Liga/ranking/rewards | Shell/gated/HOLD | Visual exists, but operational ranking/rewards are not approved. | Only after ranking policy, opt-in, anti-harm privacy rules and audit. |
| SIPAT | Shell/HOLD | `/viva-sipat` exists visually but no operational content/program/SLA. | Needs source content, owner, workflow, approval and tests. |
| Concierge | Shell/HOLD | `/concierge` is a contained preview, not a service desk. | Needs partner/process/SLA/data model before activation. |
| Canal de Denuncias | Shell/HOLD | Visual exists without anonymous reporting governance, partner, triage and legal process. | Needs legal/partner contract, anonymity model, retention, audit trail. |
| Desenvolvimento Humano/Educacao CMS | Partial/HOLD | Comunidade editorial works, but no dedicated `educacao/gerenciar` CMS surfaced for Dra. Paola. | Build education/content management wave. |
| NR-1/Yavix real | HOLD externo | Current COPSOQ/Yavix path is fail-closed mock/entitlement/consent, not real scoring/laudo/GRO/PGR. | Wait official Yavix contract/API/auth/results/governance. |
| Produtos/Modulos activation | Shell/governance partial | Navigation/module states exist, but activation cannot be treated as operational sales/provisioning. | Master Admin mutation/audit and module lifecycle gate. |
| Production runtime | HOLD | Public health liveness works locally after WB-09, but env, migrations-on-host, PM2/Nginx/logs, backup+restore and smoke accounts are not freshly proven. WB-24 adds an executable recovery-doc canary tied to `check:release-env`, but it is not host evidence. | Host release gate before any production claim. |

## Baseline preservation map

| Old surface | Current state | Risk | Decision |
| --- | --- | --- | --- |
| Old platform pages | Preserved structurally; pages grew from 34 to 44 | Medium: many were rewritten | Do not restore old files in bulk. Validate behavior. |
| Old APIs | Preserved structurally; APIs grew from 107 to 127 | Medium: contracts may differ | Keep current hardened versions unless regression is proven. |
| Auth redirects and first access | Altered | Medium/high | Started locally in WB-12/WB-13: login and `/api/auth/me` first-access projections now have focused parity coverage, and real browser login redirect/onboarding smoke covers Admin, RH, Lideranca, Colaboradora and pending first-access routing. |
| Dashboard | Heavily rewritten into protected aggregate model | Medium | WB-16 now proves Admin Master company scope, RH company override denial and Lideranca persisted-department scoping with real login/JWT. WB-18 now proves safe CSV/export serialization does not leak suppressed values or UI-only/internal fields. WB-19 adds authenticated product-boundary canaries for module shells and review surfaces. |
| Colaboradora journey | Heavily rewritten and expanded | Medium | WB-17 now proves the safe collaborator journey with real login/JWT API smoke for home, campaigns, personal agenda/exams, check-in/streak, leaderboard containment, and company challenge public projection. WB-19 adds browser canaries for Desafios, Conquistas, Objetivos, Liga and direct NR-1 runtime containment. |
| Convites/RH users | Hardened by tenant/department/approval rules | Medium | Prefer current security model; WB-14 proves real login/JWT RH own-company invite listing, foreign-tenant exclusion and Lideranca exact department invite listing. WB-15 proves RH same-company mutation plus foreign-department/user rejection. Continue dashboard/colaboradora smoke. |
| Gamification/ranking | Reduced/contained | Product gap if promised | WB-20 removed Admin accidental reactivation paths; WB-21 removed first-access gamification promises and added authenticated copy canaries for HOLD/review routes. Public/online landing is frozen by user instruction and remains out of scope. Next step is product/legal decision to rebuild safely or stop promising it inside the platform. |

## P1/P2 findings to fix

### P1

| Finding | Impact | Recommended fix |
| --- | --- | --- |
| SVG upload accepted and saved under `public/uploads` | XSS/same-origin risk if SVG is active | Fixed locally in WB-06: central upload helper now rejects SVG and allows only JPG, PNG and WebP. |
| Imported employee identity DSAR depends on `employee_identity_profiles.user_id` | Imported profile can be excluded from self-export when linked only by identity/email | Fixed locally in WB-07: DSAR has same-company same-email fallback for unlinked profiles, and invite acceptance links matching imported profiles to the created account. |
| RH/Admin reset password returns temporary password in JSON | Secret exposure through response/devtools/logging | Fixed locally in WB-03: RH/Admin reset responses no longer include `temporaryPassword`/`tempPassword`/secret material, set `must_change_password=1`, use `nanoid`, and return `passwordReset.delivery = 'out_of_band_required'`. |

### P2

| Finding | Impact | Recommended fix |
| --- | --- | --- |
| Avatar/logo uploads do not pass `userId` into tracking | Quota and `user_uploads` tracking incomplete | Fixed locally in WB-08: avatar/logo routes pass authenticated user id into the upload helper, and company logo UI copy matches the accepted JPG/PNG/WebP 5MB contract. |
| Delete request notification may miss Admin Master | LGPD deletion request can be created but not operationally routed | Fixed locally in WB-11: deletion request now notifies same-company admins and Master Admins while excluding other-company admins; focused routing test added. Fulfillment runbook remains a documentation/operations follow-up. |
| Public `/api/health` exposes counts and DB/memory details | Reconnaissance risk | Fixed locally in WB-09: public health now returns only `status` and `timestamp`; operational diagnostics remain behind authenticated/admin system routes. WB-10 realigned stale E2E gates so release tests do not require diagnostics on public health. |
| Release env still fails without target secrets/DB | Production cannot be honestly approved from local gate | Run `check:release-env` on host with redacted receipt. |
| Migration numbering has gaps and duplicate `047` prefix | Traceability risk, not immediate runner failure | Add migration ledger report and avoid future duplicate prefixes. |

### P3

| Finding | Impact | Recommended fix |
| --- | --- | --- |
| `auth-token-blacklist.test.ts` contract/name mismatch | Test quality debt | Align test name/assertion with intended cleanup behavior. |
| Capability model not centrally mapped for every API | Governance gap | Add API-role-capability matrix and negative tests. |
| Some audit callers store user id in `actorEmail` | Audit semantics confusion | Rename/store actor id and email separately. |
| Docs have stale source-of-truth and mixed counts | Operator drift | Mark old scorecards historical; this file is the current map. |
| Admin legacy badges/notification types still exist in source | Product-boundary drift risk if reconnected | Fixed locally in WB-20: dead `BadgesTab`/badge CRUD UI was removed, Admin alert send accepts only safe types, and legacy `challenge`/`gamification` payloads return 400 before DB access. Historical audit labels remain informational, not an activation path. |

## Production/runtime gate

Production stays HOLD until this checklist has fresh target evidence:

| Gate | Required evidence |
| --- | --- |
| Env/secrets | Redacted `npm run check:release-env` PASS on target host, including distinct JWT secrets, `NEXT_PUBLIC_APP_URL`, `DATABASE_PATH`, and SQLite access-token blacklist. |
| DB/migrations | Read-only report of applied migrations in the target DB; resolve/record migration gaps/duplicate prefix. |
| PM2/Nginx | Current `pm2 status`, recent logs, `nginx -t`, active cert/host evidence. |
| Backup/restore | Backup before deploy plus restore test in separate environment. |
| Authenticated smoke | Login and role navigation for Admin, RH, Lideranca, Colaboradora on target host. |
| Visual approval | Human acceptance from Dra. Paola or explicit HOLD continued. |
| Sensitive modules | Written decision that NR-1/Yavix, SIPAT, Concierge, Denuncias, Liga/ranking are not being sold as operational unless their own gates pass. |

## Merge/unification plan

The source tree is already unified into `main`. The next merge should not be another broad recovery merge.

1. Treat `origin/main` at `ddcb7f4` as the integrated code baseline.
2. Keep the local P1/P2 security/privacy repairs from WB-03, WB-06, WB-07, WB-08, WB-09 and WB-11 in the candidate; do not reopen old unsafe behavior.
3. Run a semantic regression suite for the old workflows: auth redirect, first access, invite accept/approval, RH users, dashboard, colaboradora journey, campaigns, objectives/challenges.
4. Use `docs/superpowers/plans/2026-07-29-uniher-gamification-product-decision-sheet.md` to decide gamification/ranking/rewards and RH-managed objectives/challenges/leagues: rebuild safely or stop promising. WB-20 already removed accidental Admin badge/alert reactivation paths, so this must be an explicit product rebuild, not reconnection of old code.
5. Create a module completion backlog for SIPAT, Concierge, Denuncias, Desenvolvimento Humano/Educacao CMS, NR-1/Yavix and Produtos/Modulos.
6. Only after local P1/P2 repairs are preserved and host gates pass, promote a production candidate.

## Next smallest waves

| Wave | Goal | Write scope | Gate |
| --- | --- | --- | --- |
| A | Preserve local P1/P2 security/privacy repairs | upload validation, reset-password flow, employee identity DSAR, upload tracking, deletion routing, public health | Focused unit/API tests + `test:unit` subset + independent/security review before any candidate promotion. |
| B | Old-flow semantic regression | tests only first, then minimal fixes | Started locally in WB-10/WB-12/WB-13/WB-14/WB-15/WB-16/WB-17/WB-18/WB-19/WB-20/WB-21/WB-22: master/integrado/seguranca E2E health and wellbeing gates realigned, auth first-access API projection covered, browser auth redirect/onboarding smoke passed, RH/Lideranca invite tenant/department-scope API smoke passed, RH user mutation tenant/department API smoke passed, dashboard tenant/department API smoke passed, colaboradora safe journey API smoke passed, dashboard CSV/export safe serialization passed, authenticated product-boundary smoke passed for HOLD/review/useful surfaces, Admin legacy badge/alert reactivation was removed/canaried, first-access/review copy no longer promises classic gamification, XP/rewards, leaderboard or redemption, and an executable landing-freeze boundary now proves the public/online landing paths match baseline `0fb1d517d9ce91cdab1db3703f33f2611d31abfa` and remain untouched in Wave B. Public/online landing remains frozen and out of Wave B. The remaining WB-21 decision is product/legal Option A/B/C, not implementation. |
| C | Product truth cleanup | docs/commercial copy/navigation labels | No overclaim: shells/HOLD explicitly labeled. |
| D | Module completion backlog | plan docs only unless approved | Each module gets owner, contract, data model, tests, launch gate. |
| E | Production host gate | deploy/runtime docs and receipts | WB-24 prevents recovery docs from claiming prod readiness without host evidence; actual promotion still needs redacted env PASS, migrations, PM2/Nginx, backup/restore, authenticated smoke. |

## Bottom line

We do have a recovery merge. We do not have a fully complete operational product.

The useful current platform is: authenticated shell, role navigation, Admin/RH basics, colaboradora private workflows, community/campaign basics, privacy-contained objectives/challenges/conquistas, and technical visual evidence.

The missing work is: safe rebuild or explicit removal of old gamification promises inside approved product scope, operational completion of sensitive modules, preservation of local P1/P2 repairs through review, remaining semantic regression validation of rewritten flows, and a real production host gate.
