# UniHER Pending Surfaces Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the contained Community adapter and the five collaborator placeholders with real, company-safe or self-private product surfaces without reconnecting quarantined health-derived or legacy gamification data.

**Architecture:** Deliver seven independently promotable waves. Community uses a company-scoped editorial domain. Objectives, Challenges, and Achievements share a new eligible-participation ledger that accepts only explicit, voluntary, non-sensitive actions. Semaforo remains a separate self-care domain and Liga remains blocked until its ranking policy passes a dedicated privacy gate.

**Tech Stack:** Next.js App Router, TypeScript, SQLite migrations, Zod, `withAuth`/`withRole`, `getReadDb`/`getWriteQueue`, SWR, Vitest, Playwright, existing UniHER platform primitives.

---

## 1. Current truth and scope

Baseline: branch `codex/uniher-wave3-collaborator-nr1`, commit `4916f1a`.

| Surface | Current behavior | Real dependency | Promotion state |
|---|---|---|---|
| `/comunidade` | Collaborator-only containment adapter | Company-scoped editorial feed | Ready to implement |
| `/objetivos` | Neutral legacy-gamification review state | Eligible participation ledger plus self-owned goal contract | Waiting for ledger |
| `/desafios` | Neutral legacy-gamification review state | Eligible ledger plus company-curated catalog | Waiting for ledger |
| `/conquistas` | Neutral legacy-gamification review state | Eligible ledger plus safe achievement definitions | Waiting for Objectives/Challenges contracts |
| `/semaforo` | Non-diagnostic review state | Approved self-report, consent, retention, deletion, and private-history contract | Separate product gate |
| `/liga` | Neutral legacy-gamification review state | Tenant isolation, opt-in, eligible scoring, anti-identification, and contest policy | Blocked; last wave |

The following legacy stores remain evidence only and are not source data for new product surfaces: `users.points`, `users.level`, `user_leagues`, `custom_league_members`, `user_badges`, `activity_log`, legacy `mission_logs`, legacy objective/challenge progress, and `health_scores`.

## 2. Governing decisions

1. Community is editorial, not an activity stream. It may ship before the participation ledger because posts are authored by RH/company admin and contain no collaborator health or behavior data.
2. The new participation ledger is append-only and point-free. It records only server-validated actions whose eligibility is persisted with the event.
3. Semaforo never writes to the participation ledger and never changes an objective, challenge, achievement, point, streak, ranking, feed, RH report, or NR-1 result.
4. Objectives are self-owned in the first release. RH may provide templates later, but cannot read individual progress.
5. Challenges are company-curated and voluntarily joined. RH sees catalog state and privacy-protected aggregate participation, not individual completion history.
6. Achievements are private participation milestones. No holder counts, rarity, public sharing, or health-derived badges enter the first release.
7. Liga is not reopened by reusing historical points. Its first acceptable release requires a new, explicit opt-in scoring policy over eligible ledger events.

## 3. Dependency order

```text
Wave 4  Community feed -------------------------------> independent release

Wave 5  Eligible participation ledger
                 |--------------------|
                 v                    v
Wave 6  Personal objectives     Wave 7  Company challenges
                 |                    |
                 |--------------------|
                            v
Wave 8                 Achievements

Wave 9  Personal Semaforo ----------------------------> separate self-care release

Wave 10 Liga ------------------------------------------> blocked until policy gate
```

Community starts first. After its repository/service work is stable, the ledger specification may be prepared in parallel, but mutable implementation waves keep one coordinator and disjoint write sets.

## 4. Wave 4 - Company Community feed

Canonical child plan: `docs/superpowers/plans/2026-07-20-uniher-company-community-feed.md`.

**Write scope:**

- `src/lib/db/migrations/054_company_community_feed.sql`
- `src/types/community.ts`
- `src/lib/community/`
- `src/repositories/community.repository.ts`
- `src/services/community.service.ts`
- `src/app/api/collaborator/feed/`
- `src/app/api/collaborator/saved/`
- `src/app/api/rh/community/`
- `src/app/(platform)/comunidade/`
- `src/components/community/`
- focused preference, company-profile, navigation, documentation, and test files named in the child plan

**Gate:**

- [ ] Feed defaults off for every company.
- [ ] Every read and mutation derives `companyId` from authenticated context.
- [ ] Collaborators can read, support, save, and revoke only their own relations.
- [ ] Supporter names remain hidden unless the supporter opted in.
- [ ] RH/admin author plain-text editorial posts; collaborators cannot create posts or comments.
- [ ] No check-in, Semaforo, NR-1, score, classification, employee activity, or department identity enters a post payload.
- [ ] Unit, tenant-isolation E2E, mobile/desktop screenshots, build, and privacy regression suites pass.

**Promotion decision:** promote Community independently when its gate passes. Do not wait for Waves 5-10.

## 5. Wave 5 - Eligible participation foundation

This wave creates infrastructure only. It does not expose `/objetivos`, `/desafios`, `/conquistas`, or `/liga` yet.

**Files:**

- Create: `docs/superpowers/specs/2026-07-21-uniher-eligible-participation-ledger-design.md`
- Create: `docs/superpowers/plans/2026-07-21-uniher-eligible-participation-ledger.md`
- Create: `src/lib/db/migrations/055_eligible_participation_ledger.sql`
- Create: `src/types/participation.ts`
- Create: `src/lib/participation/eligibility.ts`
- Create: `src/lib/participation/schemas.ts`
- Create: `src/repositories/participation.repository.ts`
- Create: `src/services/participation.service.ts`
- Test: `tests/unit/participation-eligibility.test.ts`
- Test: `tests/unit/participation-repository.test.ts`

**Required event contract:**

```ts
export const ELIGIBLE_PARTICIPATION_EVENTS = [
  'content_completed',
  'objective_progress_recorded',
  'objective_completed',
  'challenge_joined',
  'challenge_completed',
] as const;

export const FORBIDDEN_PARTICIPATION_SOURCES = [
  'check_in',
  'mood',
  'semaforo',
  'nr1',
  'exam',
  'appointment',
  'psychology',
  'denunciation',
] as const;
```

The database row must contain `id`, `event_key`, `company_id`, `user_id`, `event_type`, `source_domain`, `source_id`, `eligibility_version`, and `occurred_at`. `event_key` is unique and makes retries idempotent. Event metadata must be allowlisted JSON and must reject free text, health values, answers, scores, mood, department, email, and role.

**Execution steps:**

- [ ] Write the design/spec and record the event allowlist, forbidden sources, retention, self-view, DSAR, deletion, and audit behavior.
- [ ] Write failing tests proving a client cannot submit an arbitrary event, source, user ID, company ID, points, or metadata key.
- [ ] Run `npm run test:unit -- tests/unit/participation-eligibility.test.ts tests/unit/participation-repository.test.ts` and capture RED.
- [ ] Implement the migration, immutable eligibility policy, repository, and service.
- [ ] Prove cross-company reads return nothing and duplicate `event_key` writes do not create a second row.
- [ ] Prove all forbidden source names and payload keys fail closed.
- [ ] Prove no ledger writer touches legacy points, levels, leagues, badges, `health_scores`, or RH reports.
- [ ] Run the two focused suites, existing gamification containment suites, and build.

**Gate:** Wave 5 passes only when the ledger can identify why an event is eligible without inferring provenance from a legacy row.

## 6. Wave 6 - Personal Objectives

**Product contract:** Collaborators choose a personal goal from an approved catalog, record progress deliberately, archive it, and view their own history. No company user can read individual goals or progress.

**Files:**

- Create: `docs/superpowers/specs/2026-07-21-uniher-personal-objectives-design.md`
- Create: `docs/superpowers/plans/2026-07-21-uniher-personal-objectives.md`
- Create: `src/lib/db/migrations/056_personal_objectives.sql`
- Create: `src/types/objectives.ts`
- Create: `src/repositories/personal-objective.repository.ts`
- Create: `src/services/personal-objective.service.ts`
- Replace: `src/app/api/objectives/route.ts`
- Keep contained: `src/app/api/objectives/[id]/claim/route.ts`; create explicit progress/archive routes in the child plan rather than assigning new semantics to a legacy reward URL.
- Replace: `src/app/(platform)/objetivos/page.tsx`
- Create: `src/components/objectives/`
- Test: `tests/unit/personal-objective-policy.test.ts`
- Test: `tests/e2e/personal-objectives.spec.ts`

**Lifecycle:** `active -> completed | archived`. There is no reward claim, XP, points, rank, streak, employer-assigned target, or health score.

**Gate:** self-only authorization, idempotent progress, clear loading/empty/error/completed states, private history, responsive screenshots, and no legacy objective table reads.

## 7. Wave 7 - Company Challenges

**Product contract:** RH/company admin manages a safe catalog. Collaborators voluntarily join and complete challenges. The initial catalog is limited to educational and general wellbeing actions that do not require health answers or monitoring.

**Files:**

- Create: `docs/superpowers/specs/2026-07-21-uniher-company-challenges-design.md`
- Create: `docs/superpowers/plans/2026-07-21-uniher-company-challenges.md`
- Create: `src/lib/db/migrations/057_company_challenges_v2.sql`
- Create: `src/types/challenges.ts`
- Create: `src/repositories/company-challenge.repository.ts`
- Create: `src/services/company-challenge.service.ts`
- Replace contained collaborator and RH challenge routes under `src/app/api/collaborator/challenges/` and `src/app/api/rh/challenges/`.
- Replace: `src/app/(platform)/desafios/page.tsx`
- Replace: `src/app/(platform)/desafios/gerenciar/page.tsx`
- Create: `src/components/challenges/`
- Test: `tests/unit/company-challenge-policy.test.ts`
- Test: `tests/e2e/company-challenges.spec.ts`

**Allowed first-release completion modes:** `content_completed` or explicit self-confirmation. Device telemetry, step counts, mood, check-in, Semaforo, NR-1, exam, appointment, care contact, and manager confirmation are excluded.

**Gate:** company isolation, voluntary join/leave, safe catalog validation, no individual RH completion view, privacy-protected aggregates only after the existing cohort-suppression policy passes, and no read from legacy challenge progress.

## 8. Wave 8 - Private Achievements

**Product contract:** Achievements recognize eligible, non-sensitive participation. The collaborator sees her own ledger-derived milestones. The first release has no public sharing, rarity, holder counts, points, levels, or employer leaderboard.

**Files:**

- Create: `docs/superpowers/specs/2026-07-21-uniher-private-achievements-design.md`
- Create: `docs/superpowers/plans/2026-07-21-uniher-private-achievements.md`
- Create: `src/lib/db/migrations/058_private_achievements.sql`
- Create: `src/types/achievements.ts`
- Create: `src/repositories/achievement-v2.repository.ts`
- Create: `src/services/achievement-v2.service.ts`
- Replace: `src/app/api/collaborator/badges/route.ts`
- Replace: `src/app/(platform)/conquistas/page.tsx`
- Create: `src/components/achievements/`
- Test: `tests/unit/achievement-eligibility.test.ts`
- Test: `tests/e2e/private-achievements.spec.ts`

**Gate:** every achievement definition references only the Wave 5 event allowlist; issue is idempotent; revocation is auditable; legacy `user_badges` never appears in current UI; self-only authorization and responsive states pass.

## 9. Wave 9 - Personal Semaforo

Semaforo is not a Wave 5 ledger consumer. Before implementation, the product spec must choose and approve one source model. The recommended first release is a deliberate self-report with non-diagnostic labels, private history, user deletion, and no employer access.

**Files prepared only after product approval:**

- Create: `docs/superpowers/specs/2026-07-21-uniher-personal-semaforo-design.md`
- Create: `docs/superpowers/plans/2026-07-21-uniher-personal-semaforo.md`
- Create a new migration after `058`; do not reactivate `health_scores`.
- Create a dedicated type, repository, service, self API, collaborator UI components, and focused privacy/E2E tests named in the approved child plan.
- Replace the three contained Semaforo routes only after the new self API is green.

**Mandatory decision gate:** source is self-report; visible audience is the collaborator only; labels are non-diagnostic; retention and deletion are explicit; no automatic escalation occurs; no RH, leadership, Community, Objectives, Challenges, Achievements, Liga, NR-1, or reporting integration exists.

**Gate:** negative role tests prove RH, leadership, company admin, and master admin cannot read personal Semaforo data. Existing `health_scores` remain quarantined and unchanged.

## 10. Wave 10 - Liga decision and implementation gate

Liga remains a real blocked feature, not a visual placeholder repair. The recommended v1 is opt-in individual classification over a narrow set of Wave 5 eligible events, with no health or self-care input. A collective no-ranking experience should be preferred if legal/product review rejects individual classification.

**Required pre-implementation artifact:**

- Create: `docs/superpowers/specs/2026-07-21-uniher-liga-policy-decision.md`

The decision must record scoring formula, eligible events, opt-in/revocation, cohort minimum, tenant scope, tie handling, season reset, fraud/retry handling, audit, DSAR, deletion, employee-relations review, and whether names or pseudonyms are displayed.

**No implementation opens until all statements are true:**

- [ ] Only Wave 5 events can score.
- [ ] Every event has persisted eligibility provenance.
- [ ] Historical points and league rows are excluded.
- [ ] Opt-in is enforced in backend reads and writes.
- [ ] Cross-company and non-participant users are absent.
- [ ] Small-cohort and re-identification review passes.
- [ ] Semaforo, NR-1, check-in, mood, exams, appointments, psychology, and denunciations are impossible inputs.
- [ ] Product/legal approves individual ranking or explicitly selects the collective alternative.

Until then, `/liga`, management routes, leaderboard APIs, and ranking preferences remain contained.

## 11. Orchestration rules

1. Use one coordinator for integration, branch state, evidence, and promotion decisions.
2. Each wave gets a fresh pre-wave audit, written child spec, child implementation plan, disjoint write set, implementer, independent reviewer, and post-wave scorecard.
3. Do not run two migration-owning waves concurrently. Migration numbers and shared policy files are serialized.
4. Do not replace a containment response until its new repository/service and negative authorization tests are green.
5. Stage only the current wave allowlist. Do not include generated screenshots, databases, Playwright reports, or unrelated worktree changes.
6. A technical green build is insufficient: real desktop/mobile screenshots and independent visual review are required for every route.
7. A wave can promote independently only when its scope has no unresolved P0/P1/P2 finding and all named privacy gates pass.

## 12. Shared verification commands

Run after every wave, adding its focused tests before the shared suites:

```powershell
npm run test:unit
npm run test:next-config
npm run build
cd tests
npx playwright test --config=playwright.config.ts --project=privacy-wave-1-1
npx playwright test --config=playwright.config.ts --project=seguranca
```

For visual routes, add focused Playwright coverage at `375x812`, `390x844`, `768x1024`, and `1440x900`. Assert no horizontal overflow, no fixed-nav overlap, visible keyboard focus, one main heading, loading/empty/error/success states, and 44px minimum interactive targets.

## 13. Promotion ledger

| Wave | Start condition | Completion evidence | Status |
|---|---|---|---|
| 4 Community | Current branch green | Feed tests, screenshots, tenant/privacy review, scorecard | Ready |
| 5 Eligible ledger | Community repository contract stable or disjoint coordinator slot available | Eligibility tests, quarantine regression, spec/plan review | Queued |
| 6 Objectives | Wave 5 promoted | Self-only objective tests and visual evidence | Waiting |
| 7 Challenges | Wave 5 promoted | Catalog/tenant/aggregate tests and visual evidence | Waiting |
| 8 Achievements | Waves 5-7 contracts stable | Ledger derivation and self-only tests | Waiting |
| 9 Semaforo | Mandatory product/privacy decision approved | Negative-role, retention/deletion, visual evidence | Decision gate |
| 10 Liga | Waves 5 and 8 promoted plus policy approval | Ranking/collective gate, tenant/opt-in tests, visual evidence | Blocked |

## 14. First execution slice

Execute Wave 4 from the existing Community child plan. In parallel only at the documentation level, prepare the Wave 5 eligible-ledger spec for review. Do not open mutable code for Waves 5-10 until Community's migration and shared preference/company-setting edits are integrated and reviewed.

## Self-review

- Every currently intentional pending surface has an owner wave and promotion gate.
- The plan does not reconnect any quarantined store or infer eligibility from historical rows.
- Community is separated from employee activity and can ship independently.
- Objectives, Challenges, and Achievements share one explicit non-sensitive foundation.
- Semaforo and Liga have explicit decision gates rather than fake implementation readiness.
- No step introduces points, levels, rewards, public profiles, health-derived badges, or employer access to individual self-care data.
