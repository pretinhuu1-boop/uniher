# UniHER Platform Wave 1.1 Privacy Containment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contain the P0 privacy failures found after Wave 1 by removing manager Agenda exposure, quarantining contaminated gamification and Semáforo outputs, and enforcing minimum-cohort suppression in every RH reporting channel.

**Architecture:** Keep the completed Wave 1 shell and safe collaborator self-service routes. Add one fail-closed privacy kernel for typed suppression and unavailable states, make manager Agenda and all legacy ranking paths explicitly unavailable, clean historical manager Agenda notifications through auditable migrations, and project only protected aggregate metrics to dashboards and exports. Historical point and health-score provenance is not guessed or repaired; it is quarantined until the Wave 2C eligible-action ledger exists.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict mode, SQLite/better-sqlite3, SWR, Vitest 4, Playwright 1.58.

---

## Source of truth and promotion boundary

Implement this plan in `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-platform-wave1` on branch `codex/uniher-platform-wave1`, starting after documentation commit `12ef8aa` and code baseline `606ede3`.

The governing contract is `docs/superpowers/specs/2026-07-15-uniher-product-ia-roles-entitlements-privacy-design.md`, especially section 8. This wave may change privacy behavior and neutral states, but it must not build Concierge, NR-1, denunciation, Viva SIPAT, Desenvolvimento Humano, a new wellbeing check-in, a new ranking, or an entitlement system.

Do not merge, push, deploy, or start Wave 1.2 until the final scorecard in this plan is `PASS`.

## Fixed product decisions

- Personal Agenda remains self-scoped and retains personal reminders.
- RH, leadership and Admin Master receive no individual Agenda event, person, note, exam/appointment type, date or time.
- Manager Agenda endpoints return a stable `410` privacy-review response; they do not query Agenda data.
- Liga, leaderboards and their management endpoints return the same neutral unavailable state through Wave 1.2.
- Historical points, levels, league results and health-derived badges are not displayed, reported, spent, awarded, reset into a new system, or treated as eligible history.
- Semáforo returns only `Em revisão`; the last derived score is never used as a fallback.
- Every protected aggregate cell requires at least 10 distinct active participants after every filter.
- A suppressed value contains no raw value, numerator, denominator, count or recoverable adjacent total.
- Dashboard, history, communications, CSV, caches and browser views fail closed.

## File map

### Create

- `src/types/privacy.ts`
- `src/lib/privacy/api-response.ts`
- `src/lib/privacy/aggregate-suppression.ts`
- `src/lib/auth/collaborator-self.ts`
- `src/lib/gamification/containment.ts`
- `src/lib/db/migrations/048_agenda_privacy_containment.sql`
- `src/lib/db/migrations/049_legacy_gamification_quarantine.sql`
- `tests/unit/privacy/aggregate-suppression.test.ts`
- `tests/unit/privacy/agenda-alerts.service.test.ts`
- `tests/unit/privacy/agenda-history-migration.test.ts`
- `tests/unit/privacy/gamification-api-containment.test.ts`
- `tests/unit/privacy/gamification-write-containment.test.ts`
- `tests/unit/privacy/gamification-quarantine-migration.test.ts`
- `tests/unit/privacy/gamification-safe-projection.test.ts`
- `tests/unit/privacy/semaforo-containment.test.ts`
- `tests/unit/privacy/report-projection.test.ts`
- `tests/e2e/wave-1-1-privacy.spec.ts`
- `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md`

### Modify

- `package.json`
- `tests/playwright.config.ts`
- `tests/global-teardown.ts`
- `src/lib/db/migrations/runner.ts`
- `src/repositories/notification.repository.ts`
- `src/repositories/user.repository.ts`
- `src/services/auth.service.ts`
- `src/services/agenda-alerts.service.ts`
- `src/app/api/collaborator/agenda/route.ts`
- `src/app/api/collaborator/agenda/[id]/route.ts`
- `src/app/api/notifications/reminder-action/route.ts`
- `src/app/api/rh/agenda/route.ts`
- `src/app/api/rh/alert-preferences/route.ts`
- `src/app/(platform)/agenda/page.tsx`
- `src/services/gamification.service.ts`
- `src/services/league.service.ts`
- `src/services/daily-missions.service.ts`
- `src/services/objectives.service.ts`
- `src/services/activity.service.ts`
- `src/app/api/gamification/leaderboard/route.ts`
- `src/app/api/gamification/league/route.ts`
- `src/app/api/collaborator/leagues/route.ts`
- `src/app/api/rh/leagues/route.ts`
- `src/app/api/rh/leagues/[id]/route.ts`
- `src/app/api/rh/leagues/[id]/join/route.ts`
- `src/app/api/gamification/config/route.ts`
- `src/app/api/gamification/check-in/route.ts`
- `src/app/api/gamification/streak-status/route.ts`
- `src/app/api/gamification/streak/check/route.ts`
- `src/app/api/gamification/journey/route.ts`
- `src/app/api/gamification/daily-lesson/route.ts`
- `src/app/api/gamification/daily-missions/route.ts`
- `src/app/api/gamification/daily-missions/[id]/complete/route.ts`
- `src/app/api/gamification/rewards/route.ts`
- `src/app/api/gamification/rewards/redeem/route.ts`
- `src/app/api/gamification/rewards/redemptions/route.ts`
- `src/app/api/badges/route.ts`
- `src/app/api/collaborator/badges/route.ts`
- `src/app/api/admin/badges/route.ts`
- `src/app/api/admin/badges/[id]/route.ts`
- `src/app/api/objectives/route.ts`
- `src/app/api/objectives/[id]/claim/route.ts`
- `src/app/api/rh/objectives/route.ts`
- `src/app/api/rh/objectives/[id]/route.ts`
- `src/app/api/rh/challenges/route.ts`
- `src/app/api/rh/challenges/[id]/route.ts`
- `src/app/api/rh/lessons/route.ts`
- `src/app/api/rh/lessons/[id]/route.ts`
- `src/app/api/campaigns/join/route.ts`
- `src/app/api/collaborator/activities/route.ts`
- `src/app/api/collaborator/challenges/route.ts`
- `src/app/api/collaborator/challenges/[id]/route.ts`
- `src/app/api/collaborator/feed/route.ts`
- `src/app/api/collaborator/exams/route.ts`
- `src/app/api/collaborator/route.ts`
- `src/app/api/company/route.ts`
- `src/app/api/leader/team/route.ts`
- `src/app/api/rh/users/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/companies/[id]/users/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/users/me/route.ts`
- `src/app/api/users/me/preferences/route.ts`
- `src/app/api/users/me/export/route.ts`
- `src/hooks/useAuth.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/count/route.ts`
- `src/app/(platform)/notificacoes/page.tsx`
- `src/app/(platform)/colaboradora/page.tsx`
- `src/app/(platform)/conquistas/page.tsx`
- `src/app/(platform)/desafios/page.tsx`
- `src/app/(platform)/desafios/gerenciar/page.tsx`
- `src/app/(platform)/objetivos/page.tsx`
- `src/app/(platform)/gamificacao-config/page.tsx`
- `src/app/(platform)/liga/page.tsx`
- `src/app/(platform)/liga/gerenciar/page.tsx`
- `src/app/(platform)/colaboradoras-gestao/page.tsx`
- `src/app/(platform)/company-profile/page.tsx`
- `src/app/(platform)/admin/page.tsx`
- `src/app/(platform)/primeiro-acesso/page.tsx`
- `src/components/gamification/DailyLesson.tsx`
- `src/services/semaforo-calculator.service.ts`
- `src/services/collaborator.service.ts`
- `src/app/api/collaborator/semaforo/route.ts`
- `src/app/api/collaborator/semaforo/history/route.ts`
- `src/app/api/collaborator/semaforo/recalculate/route.ts`
- `src/app/api/quiz/submit/route.ts`
- `src/app/api/users/me/notification-preferences/route.ts`
- `src/app/(platform)/semaforo/page.tsx`
- `src/app/(platform)/configuracoes/page.tsx`
- `src/components/platform/ReminderPopup.tsx`
- `src/types/platform.ts`
- `src/services/dashboard.service.ts`
- `src/repositories/department.repository.ts`
- `src/app/api/dashboard/route.ts`
- `src/hooks/useDashboard.ts`
- `src/app/(platform)/dashboard/dashboard-view-model.ts`
- `src/app/(platform)/dashboard/dashboard-export.ts`
- `src/app/(platform)/dashboard/components/EngagementOverview.tsx`
- `src/app/(platform)/dashboard/components/DepartmentOverview.tsx`
- `src/app/(platform)/dashboard/components/AgeOverview.tsx`
- `src/app/(platform)/dashboard/components/DashboardDetails.tsx`
- `src/app/api/analytics/history/route.ts`
- `src/app/(platform)/historico/page.tsx`
- `src/app/api/analytics/communications/route.ts`
- `src/app/(platform)/analytics-emails/page.tsx`
- `src/components/platform/navigation.ts`
- `tests/unit/platform/navigation.test.ts`

For Agenda, modify notification list/export behavior only if the historical canary test still leaks after migration 048. Task 4 independently filters quarantined gamification notification types and labels them only in the data subject's export. Do not broaden the write set for cosmetic cleanup.

## Task 1: Add the fail-closed privacy kernel

**Files:**

- Create: `src/types/privacy.ts`
- Create: `src/lib/privacy/api-response.ts`
- Create: `src/lib/privacy/aggregate-suppression.ts`
- Create: `tests/unit/privacy/aggregate-suppression.test.ts`

- [ ] **Step 1: Write the failing aggregate contract tests**

Cover all of these cases with literal assertions:

```ts
expect(protectMetric(42, 9)).toEqual({
  status: 'suppressed',
  reason: 'minimum_cohort',
  message: 'Dados insuficientes para proteger a privacidade',
});
expect(protectMetric(42, 10)).toEqual({ status: 'visible', value: 42 });
expect(JSON.stringify(protectMetric(86421, 9))).not.toContain('86421');
```

Add constraint-group tests for row totals, column totals and time-series totals. Every equation containing any suppressed cell must retain at least one second unknown through complementary suppression. Include a 2x2 fixture where cell A is primary-suppressed, B becomes complementary-suppressed, and B also participates in a column whose total and other cell are visible; the algorithm must suppress another cell/total and repeat until stable. Cover multiple small cells in one row, two overlapping departments, a second filtered view that drops from 10 to 9, January with 10 versus February with 9, and two individually valid 10-person months whose participant-set intersection is only 9. The temporal pair and every delta must be suppressed in the last three cases. Repeat equivalent queries in a different order and prove the result is unchanged. Assert that CSV serialization contains only the suppression message and never the hidden number.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
npm run test:unit -- tests/unit/privacy/aggregate-suppression.test.ts
```

Expected: FAIL because the privacy types and helpers do not exist.

- [ ] **Step 3: Implement the closed union and minimum threshold**

Use this public shape in `src/types/privacy.ts`:

```ts
export const MINIMUM_PROTECTED_COHORT = 10 as const;
export const SUPPRESSION_MESSAGE = 'Dados insuficientes para proteger a privacidade' as const;

export type SuppressionReason =
  | 'minimum_cohort'
  | 'complementary'
  | 'not_computable';

export type ProtectedMetric<T> =
  | { status: 'visible'; value: T }
  | { status: 'suppressed'; reason: SuppressionReason; message: typeof SUPPRESSION_MESSAGE };
```

`protectMetric(value, distinctParticipants)` must fail closed for missing, non-integer or negative cohort counts. `applyComplementarySuppression(cells, constraints)` receives explicit row, column, total and series constraints. It iterates to a fixed point: every constraint containing a `minimum_cohort` or `complementary` suppressed cell must end with zero or at least two unknowns, and every new complementary suppression is propagated through all constraints before the algorithm stops. It returns new objects and removes the original `value` from every additionally suppressed cell. It must not rely on “the smallest adjacent cell” as a universal algorithm.

`protectTemporalPair()` receives internal participant-ID sets as well as values. It suppresses both members when either cohort has fewer than 10 contributors or their stable intersection has fewer than 10. Participant IDs and intersection counts never enter the public union. Wave 1.1 exposes no calculated temporal delta or arbitrary date-window comparison; unsupported comparisons return `not_computable`. Do not add `rawValue`, `participantCount`, numerator or denominator to the public union.

- [ ] **Step 4: Add one reusable privacy-unavailable response**

`src/lib/privacy/api-response.ts` owns the stable route response:

```ts
import { NextResponse } from 'next/server';

export const PRIVACY_REVIEW_BODY = {
  status: 'unavailable',
  reason: 'privacy_review',
  message: 'Recurso temporariamente indisponível durante a revisão de privacidade.',
} as const;

export function privacyReviewResponse(status = 410) {
  return NextResponse.json(PRIVACY_REVIEW_BODY, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
}
```

- [ ] **Step 5: Run the test and commit**

Run the focused test, then:

```powershell
git add src/types/privacy.ts src/lib/privacy tests/unit/privacy/aggregate-suppression.test.ts
git commit -m "feat: add fail-closed aggregate privacy kernel"
```

## Task 2: Remove manager Agenda access and preserve personal reminders

**Files:**

- Create: `src/lib/auth/collaborator-self.ts`
- Create: `tests/unit/privacy/agenda-alerts.service.test.ts`
- Modify: `src/services/agenda-alerts.service.ts`
- Modify: `src/repositories/notification.repository.ts`
- Modify: `src/app/api/collaborator/agenda/route.ts`
- Modify: `src/app/api/collaborator/agenda/[id]/route.ts`
- Modify: `src/app/api/notifications/reminder-action/route.ts`
- Modify: `src/app/api/rh/agenda/route.ts`
- Modify: `src/app/api/rh/alert-preferences/route.ts`
- Modify: `src/app/(platform)/agenda/page.tsx`
- Modify: `src/components/platform/navigation.ts`
- Modify: `tests/unit/platform/navigation.test.ts`

- [ ] **Step 1: Write failing service tests with collaborator and manager canaries**

Inject an in-memory database, inline write queue and push spy into `sendUpcomingReminders()`. Seed one due event for `Ana`, plus RH and leadership users with alert preferences. Assert:

```ts
expect(result).toEqual({ personalRemindersSent: 1 });
expect(personalNotification).toMatchObject({
  user_id: 'collaborator-ana',
  type: 'reminder',
  source: 'agenda',
  resource_id: 'event-1',
});
expect(managerNotifications).toEqual([]);
expect(pushRecipients).toEqual(['collaborator-ana']);
expect(JSON.stringify(pushPayloads)).not.toContain('Ana');
```

Also prove an overdue event is still marked `missed`, a personal browser preference is respected, and no query depends on `users.name` or `alert_preferences`.

- [ ] **Step 2: Run the focused tests and verify failure**

```powershell
npm run test:unit -- tests/unit/privacy/agenda-alerts.service.test.ts tests/unit/platform/navigation.test.ts
```

Expected: FAIL because the current service notifies managers and the current RH/leadership maps include Agenda.

- [ ] **Step 3: Make the reminder service personal-only and injectable**

Change the pending-event projection to `id`, `user_id`, `title`, `type`, `date` and `time`. Remove `company_id`, `user_name`, manager queries, manager push and `getAgendaStats()`. Add a default dependency object for production and allow tests to override only database, queue and push behavior.

Return a named result instead of counting manager sends:

```ts
export interface AgendaReminderResult {
  personalRemindersSent: number;
}
```

Record `source='agenda'` and `resource_id=event.id` on personal notifications. Keep the existing 30-minute window, default 09:00 behavior and overdue transition.

- [ ] **Step 4: Remove direct manager notification creation from Agenda POST**

In `src/app/api/collaborator/agenda/route.ts`, retain validation and the self-owned `health_events` insert. Delete every RH/leadership lookup, notification and push branch. The response may return the collaborator's created event, but no manager delivery metadata.

- [ ] **Step 5: Fail manager routes before any database access**

Keep `withRole('rh', 'lideranca', 'admin')` so unauthenticated callers remain unauthorized, then make every GET/PATCH handler in the two RH Agenda files immediately return `privacyReviewResponse()`. Delete their imports of `getReadDb`, `getWriteQueue`, `nanoid` and request-body parsing.

- [ ] **Step 6: Enforce collaborator-self capability on the server and remove manager navigation**

Create a server helper that authorizes only a user whose persisted record has `role='colaboradora'` or `also_collaborator=1`. A client-side active-view value never grants this capability. Apply it after authentication to collaborator Agenda GET/POST, `[id]` PATCH/DELETE and reminder-action. Users who possess only `rh`, `lideranca` or `admin` receive `403`; a persistently dual-role user may reach only resources owned by the same `auth.userId`.

Remove `isManager`, `/api/rh/agenda`, manager filters, aggregate stats and alert-preference controls from `src/app/(platform)/agenda/page.tsx`. An eligible self view calls only `/api/collaborator/agenda`. An ineligible role performs no Agenda fetch and renders a permission `FeedbackState`.

Remove `/agenda` from RH and leadership in `src/components/platform/navigation.ts`; do not yet perform the full Wave 1.2 regrouping. Update the exact navigation unit fixture and add deny-list assertions for both roles.

- [ ] **Step 7: Run focused verification but keep the Agenda slice uncommitted until migration 048 lands**

```powershell
npm run test:unit -- tests/unit/privacy/agenda-alerts.service.test.ts tests/unit/platform/navigation.test.ts tests/unit/platform/sidebar-navigation.test.tsx
npx tsc --noEmit
```

Do not commit yet: producer support for `source/resource_id` must land atomically with migration 048 in Task 3.

## Task 3: Clean historical manager Agenda notifications auditably and idempotently

**Files:**

- Create: `src/lib/db/migrations/048_agenda_privacy_containment.sql`
- Create: `tests/unit/privacy/agenda-history-migration.test.ts`
- Modify: `src/lib/db/migrations/runner.ts`
- Modify: `tests/global-teardown.ts`

- [ ] **Step 1: Write a failing migration fixture**

Create the minimum users, notifications, alert_preferences and audit_logs schema in an in-memory SQLite database. Seed:

- one personal `reminder` for the collaborator;
- one manager `alert` titled `Exame de colaboradora em 2 dias` containing the canary `Ana / mamografia / 09:30`;
- one manager `system` notification titled `Consulta agendada` containing the same canary;
- unrelated manager `alert` and `system` notifications that must survive;
- manager and collaborator alert preferences.

Apply migration 048 through an exported transaction helper from `runner.ts`, then call the helper a second time with the same migration name. The first call applies it and the second returns `skipped` based on `_migrations`; do not execute the raw table-rebuild SQL twice. Assert:

```ts
expect(canaryRows).toEqual([]);
expect(unrelatedRows).toHaveLength(2);
expect(personalReminder).toMatchObject({ source: null, resource_id: null });
expect(managerPreferences).toEqual([]);
expect(collaboratorPreferences).toHaveLength(1);
expect(auditReceipts).toHaveLength(1);
expect(auditReceipts[0].details).not.toContain('Ana');
```

The legacy reminder has no trustworthy event provenance and therefore remains `NULL`. The Task 2 service test proves that a newly created reminder receives `source='agenda'` and `resource_id='event-1'`.

- [ ] **Step 2: Run and verify failure**

```powershell
npm run test:unit -- tests/unit/privacy/agenda-history-migration.test.ts
```

- [ ] **Step 3: Implement migration 048**

First refactor `runner.ts` so schema SQL and the `_migrations` insert run inside one `better-sqlite3` transaction. Export a small `applyMigration(db, file, sql)` helper for the unit test. A second call for an applied filename returns `skipped`; an invalid SQL fixture rolls back both schema changes and the `_migrations` receipt.

Migration 048 itself must:

1. insert one fixed audit row using `id='migration_048_agenda_privacy_containment'`, `actor_email='system@uniher.local'`, `actor_role='system'`, `action='agenda_privacy_containment'` and count-only `details`;
2. delete alert preferences owned by `rh`, `lideranca` or `admin` users;
3. rebuild `notifications` so its CHECK accepts the existing types plus `reminder`;
4. add nullable `source TEXT` and `resource_id TEXT`;
5. remove only known manager Agenda patterns from `alert` and `system` rows;
6. preserve all unrelated notifications and indexes;
7. copy legacy rows with explicit column lists and `NULL AS source, NULL AS resource_id`; never infer provenance.

The deletion predicate must combine a manager recipient role with known Agenda titles. Never delete all alerts or all system messages.

- [ ] **Step 4: Expand Playwright teardown**

Before deleting test users, delete their `alert_preferences`, `notification_preferences` and `push_subscriptions` in addition to the existing health events and notifications.

- [ ] **Step 5: Run, inspect and commit**

```powershell
npm run test:unit -- tests/unit/privacy/agenda-history-migration.test.ts tests/unit/privacy/agenda-alerts.service.test.ts
git diff --name-only
git --literal-pathspecs add src/lib/auth/collaborator-self.ts src/lib/db/migrations/runner.ts src/lib/db/migrations/048_agenda_privacy_containment.sql src/services/agenda-alerts.service.ts src/repositories/notification.repository.ts src/app/api/collaborator/agenda/route.ts 'src/app/api/collaborator/agenda/[id]/route.ts' src/app/api/notifications/reminder-action/route.ts src/app/api/rh/agenda/route.ts src/app/api/rh/alert-preferences/route.ts 'src/app/(platform)/agenda/page.tsx' src/components/platform/navigation.ts tests/unit/privacy/agenda-alerts.service.test.ts tests/unit/privacy/agenda-history-migration.test.ts tests/unit/platform/navigation.test.ts tests/global-teardown.ts
git commit -m "fix: redact historical manager Agenda alerts"
```

Before committing, verify that `git diff --name-only --cached` contains only the exact Agenda/migration files listed above. Because the migration and producer land together, `initDb()` applies the schema before any new reminder insert can write provenance columns.

## Task 4: Quarantine legacy ranking, points and health-derived achievements

**Files:**

- Create: `src/lib/gamification/containment.ts`
- Create: `src/lib/db/migrations/049_legacy_gamification_quarantine.sql`
- Create: `tests/unit/privacy/gamification-api-containment.test.ts`
- Create: `tests/unit/privacy/gamification-write-containment.test.ts`
- Create: `tests/unit/privacy/gamification-quarantine-migration.test.ts`
- Create: `tests/unit/privacy/gamification-safe-projection.test.ts`
- Modify: every ranking, gamification, reward, badge, activity, challenge, objective, lesson, campaign, session/user projection and UI file listed in the top-level file map.

- [ ] **Step 1: Write failing API-containment tests for every reachable method**

Test the shared unavailable body for every exported method on:

```text
/api/gamification/leaderboard
/api/gamification/league
/api/gamification/journey
/api/gamification/rewards
/api/gamification/rewards/redeem
/api/gamification/rewards/redemptions
/api/collaborator/leagues
/api/rh/leagues
/api/rh/leagues/:id
/api/rh/leagues/:id/join
/api/badges
/api/collaborator/badges
/api/admin/badges
/api/admin/badges/:id
/api/objectives
/api/objectives/:id/claim
/api/rh/objectives
/api/rh/objectives/:id
/api/collaborator/challenges
/api/collaborator/challenges/:id
/api/rh/challenges
/api/rh/challenges/:id
/api/collaborator/feed
```

Rewards never return a fake `success: true`; reads and mutations are unavailable until an eligible ledger and safe catalog exist. Challenges, objectives, badges and feed are default-deny because no legacy record has a persisted non-sensitive classification. Deep-link pages render the same neutral state.

- [ ] **Step 2: Write failing write-containment tests**

Assert `/api/collaborator/activities` POST rejects client-supplied points. Exercise check-in, daily lesson completion, a permitted content-progress action and campaign join and prove they do not change `users.points`, `users.level`, `user_leagues`, `custom_league_members`, `user_badges` or `health_scores`. A personal streak may change only in the self-owned check-in record and cannot trigger a point, badge, ranking, report or Semáforo side effect.

RH lesson create/update may persist educational content but must reject or ignore `xp_reward`; campaign join may persist membership but awards no points. Every legacy challenge, objective, badge and reward completion/mutation is unavailable rather than simulated.

- [ ] **Step 3: Write failing safe-projection tests**

Recursively inspect authenticated responses for register, login, `/api/auth/me`, `/api/users/me`, collaborator home, company, leadership team, RH users, Admin users, Admin company users, notification list and notification count. Assert they omit `points`, `level`, `league`, `week_points`, `points_spent`, XP, legacy gamification notification content and quarantined badges. Assert the generic user repository update allowlist cannot write `points` or `level`.

Add source-contract assertions that platform pages no longer render legacy point/level/rank totals, XP promises or badge-holder counts. Allow the word `Pontos` only where it means an attention point in non-gamification copy.

- [ ] **Step 4: Write a failing preservation-first migration test**

Seed canary rows in `users`, `user_leagues`, `custom_league_members`, `user_badges`, `daily_missions`, `mission_logs`, `activity_log` and `health_scores`. Apply migration 049 through the transaction helper and assert every original row/value still exists unchanged, a quarantine marker exists for every legacy domain, and no eligible ledger was created. Call the helper again and assert `skipped` with no duplicate marker or audit receipt.

- [ ] **Step 5: Run and verify all four focused suites fail**

```powershell
npm run test:unit -- tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-quarantine-migration.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
```

- [ ] **Step 6: Centralize a default-deny quarantine state**

`src/lib/gamification/containment.ts` must export immutable values used by APIs and pages:

```ts
export const LEGACY_GAMIFICATION_STATE = {
  status: 'under_review',
  reason: 'eligible_ledger_required',
  message: 'Pontuação e classificação estão em revisão.',
} as const;

export const SAFE_MISSION_ACTIONS = new Set([
  'read_content',
]);
```

Do not include challenge completion, badge sharing, check-in, mood, water, exams, appointments or Semáforo. `read_content` records only private point-free educational progress; it never enters feed, ranking, achievements or RH reporting. Until Wave 2C adds persisted classification and an eligible ledger, every legacy challenge, badge and objective is untrusted.

- [ ] **Step 7: Make ranking, badge, objective, challenge, reward and feed paths explicitly unavailable**

Every handler listed in Step 1 returns `privacyReviewResponse()` before opening the database. Replace Liga, Conquistas, legacy Desafios and legacy point/reward panels with `FeedbackState` using `LEGACY_GAMIFICATION_STATE.message`. Remove league fetches, cards and notifications from the collaborator home. Keep route files only for backward-compatible neutral deep links; Wave 1.2 removes blocked navigation where specified.

- [ ] **Step 8: Preserve point-free education and presence without fake commercial success**

For allowed educational progress and campaign membership only, return:

```ts
{
  success: true,
  progressRecorded: true,
  gamification: LEGACY_GAMIFICATION_STATE,
}
```

and never call or reproduce a point/level/league/badge write. `/api/collaborator/activities` POST and all reward, challenge, objective and badge mutations return `410`; they do not report success. Daily missions serve only point-free `read_content`. Check-in preserves only its current private presence/streak behavior and removes XP, level, badge, ranking, feed, report and Semáforo effects.

Remove `recalculateSemaforo()` from check-in and collaborator exam flows. `streak-status` and `streak/check` may return a private streak value but omit point, level, XP and league fields. `journey` is unavailable until its XP contract is separated.

- [ ] **Step 9: Replace generic user/session projections and unsafe configuration**

Replace `toPublicUser()` use at public/session boundaries with an explicit safe projection that excludes `points`, `level`, `league`, XP, streak-derived rewards and badges. Remove `points` and `level` from `user.repository.updateUser()`'s generic allowlist. Login, auth refresh, `/users/me`, collaborator home, company, leadership, RH and Admin projections use the safe type. A dedicated private streak endpoint remains the only self projection allowed to return streak.

Notification list/count projections exclude legacy `badge`, `level`, `streak`, `gamification` and `reward` rows while preserving those rows for the data subject's labeled export. The notification page must not reconstruct or display them from another source.

Gamification config GET returns only `active_themes`, `theme_order`, `hearts_enabled`, `hearts_per_day` and `hearts_refill_hours`. PATCH accepts only those fields. Reject XP, streak bonus, league, rank and point-cost fields with the typed unavailable body. Replace the XP, league and point-priced reward panels in `gamificacao-config/page.tsx` with one neutral review notice.

Hide the personal `Exibir no ranking` toggle and reject `privacy_ranking` preference changes while ranking is unavailable; preserve any stored value for Wave 2C review rather than deleting it.

Remove numeric point/level/rank rendering and point-priced actions from collaborator home, Conquistas, Desafios, Objetivos, RH collaborator management, company profile, Admin Master and first-access copy. Do not replace a hidden number with `0`; use the neutral review state. Remove XP promises from `DailyLesson`, RH lesson forms and completion messages.

- [ ] **Step 10: Keep the social feed unavailable and preserve DSAR evidence**

The legacy social feed remains neutral/unavailable until Wave 2C introduces eligible provenance; it does not infer safe rows. Existing missions and logs remain stored, but readers exclude every action except private point-free `read_content` progress.

The data-subject export is not an RH report and is exempt from k=10. Preserve the subject's own historical records, but place points/levels/badges and `health_scores` under an explicit `legacyDerivedData` section labeled `Derivado legado — em revisão`; do not present them as current health or eligible gamification. RH/leadership/Admin exports may contain only their own subject data and no collaborator Agenda canary.

- [ ] **Step 11: Implement migration 049 as preservation-first quarantine**

Create an idempotent internal table:

```sql
CREATE TABLE IF NOT EXISTS legacy_privacy_quarantine (
  domain TEXT NOT NULL,
  record_table TEXT NOT NULL,
  record_key TEXT NOT NULL,
  reason TEXT NOT NULL,
  quarantined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (domain, record_table, record_key)
);
```

Mark, without deleting or altering source rows, every existing user league/custom league member, user badge, daily mission, mission log, gamification activity, legacy gamification notification, non-zero user point/level record and health score. Insert a count-only audit row with `id='migration_049_legacy_gamification_quarantine'`, `actor_email='system@uniher.local'`, `actor_role='system'` and `action='legacy_gamification_quarantine'`. Do not reset values, infer eligibility, copy them into a new ranking, or create an eligible ledger. All application readers/writers enforce the quarantine independently; this table is durable evidence, not a UI query source.

- [ ] **Step 12: Run focused tests, audit every mutation pattern and commit only owned files**

```powershell
npm run test:unit -- tests/unit/privacy/gamification-api-containment.test.ts tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-quarantine-migration.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
rg -n "UPDATE users SET points|SUM\(points\)|user_leagues|week_points|pointsEarned|xp_reward|holder_count|toPublicUser|recordHealthScore|INSERT INTO health_scores|recalculateSemaforo" src/services src/repositories src/app/api
```

No hit is accepted merely because it is called “quarantine code”. For each hit, prove through a response/write test that no authenticated route can expose or mutate the legacy field. Any reachable unguarded path is a blocker.

```powershell
$owned = @(
  'src/lib/gamification/containment.ts',
  'src/lib/db/migrations/049_legacy_gamification_quarantine.sql',
  'src/types/platform.ts',
  'src/repositories/user.repository.ts',
  'src/repositories/notification.repository.ts',
  'src/services/auth.service.ts',
  'src/services/league.service.ts',
  'src/services/gamification.service.ts',
  'src/services/daily-missions.service.ts',
  'src/services/objectives.service.ts',
  'src/services/activity.service.ts',
  'src/services/collaborator.service.ts',
  'src/app/api/auth/login/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/auth/me/route.ts',
  'src/app/api/users/me/route.ts',
  'src/app/api/users/me/preferences/route.ts',
  'src/app/api/users/me/export/route.ts',
  'src/app/api/collaborator/route.ts',
  'src/app/api/company/route.ts',
  'src/app/api/leader/team/route.ts',
  'src/app/api/rh/users/route.ts',
  'src/app/api/admin/users/route.ts',
  'src/app/api/admin/companies/[id]/users/route.ts',
  'src/app/api/gamification/leaderboard/route.ts',
  'src/app/api/gamification/league/route.ts',
  'src/app/api/gamification/journey/route.ts',
  'src/app/api/gamification/config/route.ts',
  'src/app/api/gamification/check-in/route.ts',
  'src/app/api/gamification/streak-status/route.ts',
  'src/app/api/gamification/streak/check/route.ts',
  'src/app/api/gamification/daily-lesson/route.ts',
  'src/app/api/gamification/daily-missions/route.ts',
  'src/app/api/gamification/daily-missions/[id]/complete/route.ts',
  'src/app/api/gamification/rewards/route.ts',
  'src/app/api/gamification/rewards/redeem/route.ts',
  'src/app/api/gamification/rewards/redemptions/route.ts',
  'src/app/api/collaborator/leagues/route.ts',
  'src/app/api/rh/leagues/route.ts',
  'src/app/api/rh/leagues/[id]/route.ts',
  'src/app/api/rh/leagues/[id]/join/route.ts',
  'src/app/api/badges/route.ts',
  'src/app/api/collaborator/badges/route.ts',
  'src/app/api/admin/badges/route.ts',
  'src/app/api/admin/badges/[id]/route.ts',
  'src/app/api/objectives/route.ts',
  'src/app/api/objectives/[id]/claim/route.ts',
  'src/app/api/rh/objectives/route.ts',
  'src/app/api/rh/objectives/[id]/route.ts',
  'src/app/api/collaborator/challenges/route.ts',
  'src/app/api/collaborator/challenges/[id]/route.ts',
  'src/app/api/rh/challenges/route.ts',
  'src/app/api/rh/challenges/[id]/route.ts',
  'src/app/api/rh/lessons/route.ts',
  'src/app/api/rh/lessons/[id]/route.ts',
  'src/app/api/campaigns/join/route.ts',
  'src/app/api/collaborator/activities/route.ts',
  'src/app/api/collaborator/feed/route.ts',
  'src/app/api/notifications/route.ts',
  'src/app/api/notifications/count/route.ts',
  'src/hooks/useAuth.ts',
  'src/app/(platform)/colaboradora/page.tsx',
  'src/app/(platform)/conquistas/page.tsx',
  'src/app/(platform)/desafios/page.tsx',
  'src/app/(platform)/desafios/gerenciar/page.tsx',
  'src/app/(platform)/objetivos/page.tsx',
  'src/app/(platform)/gamificacao-config/page.tsx',
  'src/app/(platform)/liga/page.tsx',
  'src/app/(platform)/liga/gerenciar/page.tsx',
  'src/app/(platform)/colaboradoras-gestao/page.tsx',
  'src/app/(platform)/company-profile/page.tsx',
  'src/app/(platform)/admin/page.tsx',
  'src/app/(platform)/primeiro-acesso/page.tsx',
  'src/app/(platform)/notificacoes/page.tsx',
  'src/app/(platform)/configuracoes/page.tsx',
  'src/components/gamification/DailyLesson.tsx',
  'tests/unit/privacy/gamification-api-containment.test.ts',
  'tests/unit/privacy/gamification-write-containment.test.ts',
  'tests/unit/privacy/gamification-quarantine-migration.test.ts',
  'tests/unit/privacy/gamification-safe-projection.test.ts'
)
$changed = @(git diff --name-only)
$unexpected = @($changed | Where-Object { $_ -notin $owned })
if ($unexpected) { throw "Add every intended Task 4 path to the explicit owned list; never stage by directory:`n$unexpected" }
git --literal-pathspecs add -- $owned
if (@(git diff --name-only --cached | Where-Object { $_ -notin $owned })) { throw 'Unexpected staged file' }
git commit -m "fix: quarantine legacy health-linked gamification"
```

Do not use directory-wide `git add`, `git add -A` or `git add -u`.

## Task 5: Put Semáforo into a non-diagnostic review state

**Files:**

- Create: `tests/unit/privacy/semaforo-containment.test.ts`
- Modify: `src/services/semaforo-calculator.service.ts`
- Modify: `src/services/collaborator.service.ts`
- Modify: `src/app/api/collaborator/exams/route.ts`
- Modify: the three collaborator Semáforo routes
- Modify: `src/app/api/quiz/submit/route.ts`
- Modify: `src/app/api/users/me/notification-preferences/route.ts`
- Modify: `src/app/(platform)/semaforo/page.tsx`
- Modify: `src/app/(platform)/configuracoes/page.tsx`
- Modify: `src/components/platform/ReminderPopup.tsx`
- Modify: every remaining writer found by `rg -n "recalculateSemaforo|recordHealthScore|INSERT INTO health_scores" src`

- [ ] **Step 1: Write failing response and copy tests**

Assert both Semáforo GET endpoints return exactly:

```ts
{
  status: 'under_review',
  label: 'Em revisão',
  message: 'Estamos revisando este recurso para separar cuidado e gamificação.',
}
```

with `Cache-Control: private, no-store` and `Vary: Cookie`. Assert the response JSON contains no dimension, score, red/yellow/green status or recorded_at. Assert recalculation returns `423` with the same state and does not write `health_scores`.

Submit the quiz, run check-in, create an exam and call every Semáforo route, then assert the `health_scores` row count never changes. Add source assertions that the page, configuration page and popup contain no `Urgente`, `Saudável`, red-alert escalation, `update_semaforo` preference or reminder trigger based on a score.

- [ ] **Step 2: Run and verify failure**

```powershell
npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts
```

- [ ] **Step 3: Stop all calculation triggers**

Remove dynamic imports/calls from check-in and exams. Remove direct health-score writes from quiz submission while preserving only point-free educational completion. Remove `update_semaforo` from notification-preference defaults, accepted schemas and configuration UI. Make the calculator's exported recalculate entry points throw a typed containment error so an undiscovered caller cannot silently write. Once the writer audit proves zero reachable writes remain, leave the file as an explicit blocked boundary rather than deleting historical logic in this wave.

- [ ] **Step 4: Return and render only the neutral state**

Both GET routes return the exact object above; POST returns status `423`. The page renders a single `FeedbackState` headed `Semáforo da Saúde` with label `Em revisão`. Remove charts, animated scores, clinical color counts and agenda reminders derived from dimensions. The collaborator may still reach the route, but no contaminated value appears.

- [ ] **Step 5: Run focused tests and commit**

```powershell
npm run test:unit -- tests/unit/privacy/semaforo-containment.test.ts tests/unit/privacy/gamification-write-containment.test.ts
rg -n "recalculateSemaforo|recordHealthScore|INSERT INTO health_scores" src/app src/components src/services src/repositories
git add src/services/semaforo-calculator.service.ts src/services/collaborator.service.ts src/app/api/collaborator/exams/route.ts src/app/api/collaborator/semaforo/route.ts src/app/api/collaborator/semaforo/history/route.ts src/app/api/collaborator/semaforo/recalculate/route.ts src/app/api/quiz/submit/route.ts src/app/api/users/me/notification-preferences/route.ts 'src/app/(platform)/semaforo/page.tsx' 'src/app/(platform)/configuracoes/page.tsx' src/components/platform/ReminderPopup.tsx tests/unit/privacy/semaforo-containment.test.ts
git commit -m "fix: neutralize contaminated Semaforo scoring"
```

Every remaining grep hit must be a quarantined repository/helper with no reachable writer. Prove that condition with the write-containment test; source scanning alone is not sufficient.

## Task 6: Protect dashboard, history, communications and exports at k=10

**Files:**

- Create: `tests/unit/privacy/report-projection.test.ts`
- Modify: dashboard types, service, API, hook, view model, components and export files listed above
- Modify: `src/repositories/department.repository.ts`
- Modify: `src/hooks/useAuth.ts`
- Modify: history API/page
- Modify: communications API/page

- [ ] **Step 1: Write failing service and serialization tests**

Build fixtures for 9 and 10 distinct active contributing users, two departments where one hidden cell would be reconstructable, row/column totals, overlapping departments, successive filters, adjacent months and overlapping windows. Test the service projection rather than only component copy.

Required assertions:

```ts
expect(ninePersonMetric.status).toBe('suppressed');
expect(tenPersonMetric).toEqual({ status: 'visible', value: 10 });
expect(JSON.stringify(ninePersonResponse)).not.toMatch(/86421|rawValue|numerator|denominator/);
expect(csvForNinePeople).toContain('Dados insuficientes para proteger a privacidade');
expect(csvForNinePeople).not.toContain('86421');
```

Assert health-risk output is `not_computable` because its source is the quarantined Semáforo. Assert point history/ranking is unavailable, not zero. Assert communication metrics use an explicit safe operational action allowlist, exclude Agenda alerts/reminders, mood, wellbeing, Semáforo, exams, appointments and health-derived actions, and are suppressed by distinct contributors.

- [ ] **Step 2: Run and verify failure**

```powershell
npm run test:unit -- tests/unit/privacy/report-projection.test.ts
```

- [ ] **Step 3: Project protected metrics in the service layer**

An active contributor is a distinct collaborator who both contributed to that exact metric cell and has `deleted_at IS NULL`, `blocked = 0` and `approved = 1`, after tenant, department, fixed period and status filters. Never use company headcount as the cohort for a cell with fewer contributors. The internal contributor IDs/counts never enter the response.

Use this fixed decision table:

| Metric | Wave 1.1 projection |
|---|---|
| Engagement derived from legacy points/streak/activity | `not_computable` |
| Health risk / Semáforo | `not_computable` |
| Points / ranking / badges / eligible history | `unavailable` |
| Exam activity | Distinct contributors with an event in the fixed period; k=10 plus complementary suppression |
| Age bucket | Distinct active people inside that bucket; k=10 plus row/total complementary suppression |
| Campaign participation | `not_computable` until campaign sensitivity classification exists |
| Legacy/fabricated ROI | `not_computable` |
| Safe communications metadata | Explicit non-sensitive allowlist, distinct contributors, k=10 plus complementary suppression |

Pass every supported scalar and series cell through the privacy kernel. Apply the explicit row/column/total constraints and stable-participant temporal suppression before serialization. Permit only fixed period buckets; do not expose arbitrary date ranges or calculated deltas in Wave 1.1.

Do not derive department ranking, engagement or ROI from legacy `users.points`, streak, health_scores or exams. If a safe distinct-participation source is not available, return `not_computable` without a numeric value.

- [ ] **Step 4: Make HTTP and client caches fail closed**

Add `Cache-Control: private, no-store` and `Vary: Cookie` to dashboard, history and communications responses. Every protected fetch uses `{ cache: 'no-store' }`.

Dashboard, history and communications SWR keys include endpoint, authenticated company ID, role and fixed filters. They use `revalidateOnFocus: true`, `dedupingInterval: 0`, `keepPreviousData: false` and no protected `fallbackData`. Logout, session refresh, role/view change and company change clear protected SWR data before rendering the next scope. A filter change renders loading/suppressed state rather than the prior filter's number.

- [ ] **Step 5: Render/export the union exhaustively**

Components must branch on `metric.status`. A suppressed cell renders only `metric.message`; a visible cell renders `metric.value`. Use an exhaustive `never` check so later states cannot fall through to `0`.

`dashboard-export.ts` follows the same branch. The history route/page returns a neutral eligible-ledger-required state until Wave 2C; it never renders the legacy point timeline or ranking. Communications reports only protected operational delivery/activity metadata and excludes alert/reminder content.

Search for scheduled report generators and background exporters. If none exist, record the exact search and result in the scorecard; do not credit unimplemented scheduled reporting as protected. If a reachable generator exists, route it through the same protected projection before this task can pass.

- [ ] **Step 6: Run focused verification and commit**

```powershell
npm run test:unit -- tests/unit/privacy/aggregate-suppression.test.ts tests/unit/privacy/report-projection.test.ts tests/unit/platform/dashboard-view-model.test.ts tests/unit/platform/dashboard-export.test.ts tests/unit/platform/use-dashboard.test.ts
npx tsc --noEmit
git add src/types/platform.ts src/repositories/department.repository.ts src/services/dashboard.service.ts src/app/api/dashboard/route.ts src/hooks/useDashboard.ts src/hooks/useAuth.ts 'src/app/(platform)/dashboard/page.tsx' 'src/app/(platform)/dashboard/dashboard-view-model.ts' 'src/app/(platform)/dashboard/dashboard-export.ts' 'src/app/(platform)/dashboard/components/EngagementOverview.tsx' 'src/app/(platform)/dashboard/components/DepartmentOverview.tsx' 'src/app/(platform)/dashboard/components/AgeOverview.tsx' 'src/app/(platform)/dashboard/components/DashboardDetails.tsx' src/app/api/analytics/history/route.ts 'src/app/(platform)/historico/page.tsx' src/app/api/analytics/communications/route.ts 'src/app/(platform)/analytics-emails/page.tsx' tests/unit/privacy/report-projection.test.ts
git commit -m "fix: suppress small cohorts across RH reporting"
```

## Task 7: Add the independent privacy browser gate

**Files:**

- Create: `tests/e2e/wave-1-1-privacy.spec.ts`
- Modify: `tests/playwright.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Register a dedicated project and script**

Add:

```ts
{
  name: 'privacy-wave-1-1',
  testMatch: 'wave-1-1-privacy.spec.ts',
  use: { headless: true, serviceWorkers: 'block' },
}
```

and:

```json
"test:wave1.1": "npm run test:unit && cd tests && npx playwright test --config=playwright.config.ts --project=privacy-wave-1-1"
```

- [ ] **Step 2: Write the negative role, tenant and payload probes**

Seed two companies and canary values such as `CANARY-ANA-MAMOGRAFIA-0930` and `CANARY-OTHER-TENANT`. Verify:

- collaborator A can CRUD only their own Agenda event;
- collaborator A receives `404` for collaborator B's Agenda PATCH/DELETE;
- RH, leadership and Admin receive `410` on manager Agenda and alert-preference routes;
- RH, leadership and Admin without persisted collaborator capability receive `403` on collaborator Agenda and reminder-action routes; a dual-role fixture with `also_collaborator=1` can access only its own event;
- no manager notification, push-visible list, manager response or RH/leadership/Admin `/api/users/me/export` contains either collaborator canary; a collaborator self-export may contain only that collaborator's self-owned reminder;
- all league, leaderboard, badge, objective, challenge, reward and feed reads/mutations return neutral unavailable state and no tenant/user rows;
- Semáforo reads contain only `Em revisão` and recalc cannot write;
- quiz, check-in, exam and every known Semáforo writer leave `health_scores` unchanged;
- a 9-person dashboard cell is suppressed, a 10-person cell is visible;
- a hidden department cannot be reconstructed from row/column totals, repeated filters or query order;
- two 10-person periods with only 9 stable participants suppress both values/delta;
- after warming company A's dashboard cache, switching to company B in the same browser never renders A's canary, including during loading;
- history is unavailable and communications contains no Agenda payload;
- every protected response uses `private, no-store` and `Vary: Cookie`.

- [ ] **Step 3: Run the dedicated project**

```powershell
npm run test:wave1.1
```

Expected: all unit tests and `privacy-wave-1-1` tests PASS with zero canary leaks.

- [ ] **Step 4: Commit the browser gate**

```powershell
git add package.json tests/playwright.config.ts tests/e2e/wave-1-1-privacy.spec.ts
git commit -m "test: add Wave 1.1 privacy promotion gate"
```

## Task 8: Run the full regression gate and publish the scorecard locally

**Files:**

- Create: `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md`
- Modify: `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md` only to add a forward link that its original privacy result was reopened and superseded.

- [ ] **Step 1: Run static and focused verification**

```powershell
npm run test:unit
npx tsc --noEmit
npm run build
```

- [ ] **Step 2: Run all relevant browser suites**

```powershell
npm run test:wave1.1
npm run test:master
npm run test:seguranca
npm run test:rh
npm run test:colaboradora
npm run test:integrado
cd tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
cd ..
```

- [ ] **Step 3: Perform a final source and payload audit**

```powershell
rg -n "api/rh/agenda|alert_preferences|user_leagues|week_points|recalculateSemaforo|health_scores|UPDATE users SET points|SUM\(points\)|pointsEarned|xp_reward|holder_count|toPublicUser|recordHealthScore|INSERT INTO health_scores" src
rg -n "Urgente|Saudável|Liga Semanal|ranking|XP|pts" 'src/app/(platform)' src/components
rg -n "scheduled|cron|report|export" src/services src/app/api src/instrumentation.ts
git diff --check
git status --short
```

Classify every remaining hit as unreachable quarantine code, schema/history, safe non-gamification wording or a blocker, and attach response/write-test evidence for every reachable candidate. The third search inventories scheduled reports and background exporters; record explicitly when no reachable generator exists. Any reachable manager Agenda payload, contaminated score writer, legacy point number, ranking output, small-cohort raw value or suppressed export number is an automatic `FAIL`.

- [ ] **Step 4: Write the scorecard with evidence**

Record:

- the exact machine-readable fields:

```text
- Reviewed code commit: `<sha>`
- Decision: PASS
```

Use `- Decision: FAIL` instead when any required gate fails;
- exact command/result table;
- Agenda collaborator-self and manager-negative probes;
- historical-notification migration counts and idempotence result without sensitive content;
- ranking/points and Semáforo quarantine probes;
- 9/10, complementary and temporal suppression probes;
- API/UI/CSV/cache outcomes;
- regression outcomes;
- known non-blocking debt;
- final `PASS` or `FAIL` promotion decision.

Do not write `PASS` if any required command was skipped or failed.

- [ ] **Step 5: Commit the verified gate**

```powershell
git add docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md
git commit -m "docs: record Wave 1.1 privacy gate"
```

## Completion criteria

Wave 1.1 is complete only when:

- personal Agenda still works and personal reminders still arrive;
- no manager/admin path or historical payload exposes individual Agenda data;
- ranking and league output/management are neutral and unavailable;
- historical points, levels, badges, leagues, missions and health scores remain preserved as quarantined evidence but are not displayed, serialized into product projections or reused;
- register/login/session, collaborator, RH, leadership and Admin projections omit every quarantined field;
- no wellbeing/health action awards or spends legacy points;
- Semáforo exposes only `Em revisão`, cannot recalculate and has no reachable `health_scores` writer;
- every protected aggregate and export enforces k=10 plus complementary/temporal suppression;
- negative tenant, role and payload canaries pass;
- unit, TypeScript, build, privacy, Master, security, RH, collaborator, integrated and foundation suites pass;
- the Wave 1.1 scorecard says `PASS` on the exact reviewed commit.
