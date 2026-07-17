# UniHER Wave 1.1 Corrective Mission Design

**Status:** approved direction; written specification awaiting user review before implementation

**Baseline code commit:** `f398d535c5c30bf79f6bb1d2cee26a55217a9731`

**Branch:** `codex/uniher-wave1-1-corrective`

**Worktree:** `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave1-1-corrective`

## 1. Purpose

Close the confirmed defects that prevent an honest Wave 1.1 privacy-containment gate without starting Wave 1.2 navigation alignment or any later route redesign.

The mission fixes four bounded problem domains:

1. sparse user-preference updates fail under Zod 4 and block first access plus settings;
2. JavaScript Unicode escapes were placed in JSX text and quoted attributes, so authenticated pages render literal `\u...` sequences;
3. reachable public metadata and account email copy still promise quarantined legacy gamification behavior;
4. the Admin desktop screenshot baseline still contains the intentionally removed `Badges` tab.

After the code and test corrections, the mission runs the complete Wave 1.1 promotion gate on one frozen code commit and replaces the partial scorecard with exact evidence.

## 2. Source-of-truth boundaries

This design is subordinate to:

- `docs/superpowers/specs/2026-07-15-uniher-product-ia-roles-entitlements-privacy-design.md`;
- `docs/superpowers/plans/2026-07-15-uniher-platform-wave-1-1-privacy-containment.md`;
- `docs/superpowers/plans/2026-07-15-uniher-platform-wave-1-2-navigation-alignment.md`.

Wave 1.2 remains blocked until the final Wave 1.1 scorecard records `PASS` for an exact reviewed code commit, no later non-documentation drift exists, and the execution worktree is clean.

## 3. Workspace isolation

The original worktree contains a user-owned modification in `tests/unit/privacy/dsar-export-cooldown.test.ts`. This mission must never read for implementation, edit, format, stage, stash, revert, commit, or use that modification as test evidence.

All implementation, review, and gate commands run in the clean corrective worktree created from `f398d535`. Staging uses explicit path allowlists; `git add -A` and `git add -u` are prohibited.

The clean baseline is 27 unit files and 269 tests. The original worktree's higher count is not the review baseline.

## 4. Functional design

### 4.1 Sparse user-preference patches

`PATCH /api/users/me/preferences` remains an authenticated, allowlisted, transactional upsert endpoint.

The request schema changes from exhaustive `z.record(z.enum(VALID_KEYS), z.string())` to sparse `z.partialRecord(z.enum(VALID_KEYS), z.string())`. This preserves the existing string-value contract while allowing current clients to update one preference at a time.

Required behavior:

- one allowed key returns `200` and persists only that key;
- an empty preferences object returns `200 { success: true }` without acquiring the write queue;
- an unknown key or non-string value returns `400` without writing;
- any otherwise valid payload containing `privacy_ranking` returns the existing typed `410` privacy-review response;
- a mixed payload of allowed keys containing `privacy_ranking` is rejected atomically and persists no other key;
- the first-access `Pular tour` action performs the real PATCH, persists `first_access_tour_completed = '1'`, refreshes the session projection, and advances to the final confirmation;
- the settings page continues to update one preference at a time.

Tightening all values to `'0' | '1'` is not part of this correction because the existing endpoint contract accepts strings and changing it would broaden compatibility risk.

### 4.2 Authenticated JSX copy integrity

Only Unicode escapes located in JSX text nodes or quoted JSX attributes are defective. Escapes inside JavaScript expression strings, error strings, model values, API values, CSV code, tests, and emoji literals decode correctly and must not be normalized mechanically.

The confirmed repair surface is exactly 27 JSX nodes containing 48 raw escapes in seven files:

- `src/app/(platform)/dashboard/page.tsx`;
- `src/app/(platform)/dashboard/components/EngagementOverview.tsx`;
- `src/app/(platform)/dashboard/components/DepartmentOverview.tsx`;
- `src/app/(platform)/dashboard/components/DashboardDetails.tsx`;
- `src/app/(platform)/dashboard/components/AgeOverview.tsx`;
- `src/app/(platform)/historico/page.tsx`;
- `src/app/(platform)/analytics-emails/page.tsx`.

Those JSX literals are replaced with native UTF-8 Portuguese copy. An AST-based unit contract scans JSX text and quoted JSX attributes from the authenticated route entries and rejects raw Unicode escape sequences without rejecting valid JavaScript string literals.

Behavioral browser coverage must use exact accessible Portuguese names rather than prefix regexes such as `/Faixas et/`. Dashboard, History, and Communications must render without any literal `\u[0-9a-f]{4}` text.

### 4.3 Reachable public and email copy

Legacy ranking, points, XP, badges, streaks, arena, dopamine, and reward promises remain unavailable under the Wave 1.1 containment contract. Public or transactional copy must not promise those behaviors.

The existing public-home reachability test starts at `src/app/page.tsx` and misses the Next.js root layout. The corrected contract explicitly includes `src/app/layout.tsx` and rendered email templates.

Required changes:

- replace legacy gamification claims in root metadata and JSON-LD with implemented language limited to educational journeys, campaigns, personal self-service, and privacy-protected aggregate management;
- replace the live invitation template promise with access to campaigns, educational content, and the collaborator's private journey;
- replace the dormant welcome template's badge promise with the same implemented content-and-private-journey boundary so future reuse cannot reactivate stale copy;
- preserve password-reset copy and other unrelated email behavior;
- keep unreachable quarantine components stored but unreachable; this mission does not delete historical components or data.

### 4.4 Admin visual baseline

The removal of the Admin `Badges` tab is an intentional privacy-containment change introduced before this mission. It must not be reverted.

The foundation browser contract adds a semantic assertion that no active Admin tab named `Badges` is rendered. The desktop snapshot is then regenerated and inspected at original resolution.

The only approved desktop delta is:

- `Badges 6` is absent;
- `Sistema`, `Alertas`, and `Auditoria` shift left into the released space;
- sidebar, typography, cards, colors, content, and geometry outside the tab row remain unchanged.

The mobile snapshot must be executed and inspected independently. It is updated only if the current render has a separately explained intentional delta.

## 5. Test design and TDD contract

Every production correction follows RED, verified RED, minimal GREEN, verified GREEN, and refactor while green.

### Preference coverage

Create `tests/unit/privacy/user-preferences-route.test.ts` with an in-memory SQLite database, direct authenticated route invocation, real transactional writes, and a write-queue call counter.

Cover sparse success, empty no-op, unknown key, non-string value, `privacy_ranking`, and mixed atomic rejection. Add a real first-access browser regression to `tests/e2e/wave-1-1-privacy.spec.ts` and restore its test fixture in `finally`.

### Copy coverage

Create `tests/unit/platform/authenticated-jsx-copy.test.ts` using the TypeScript AST to inspect JSX text and quoted attributes. Extend:

- `tests/unit/platform/dashboard-charts.test.tsx` for exact rendered Portuguese labels;
- `tests/e2e/rh.spec.ts` for exact Dashboard, History, and Communications UI assertions;
- `tests/unit/privacy/home-gamification-reachability.test.ts` for root layout and rendered mail templates.

### Visual coverage

Extend `tests/e2e/platform-foundation.spec.ts` with the semantic `Badges` absence assertion. Update and inspect `tests/e2e/platform-foundation.spec.ts-snapshots/platform-shell-desktop-platform-foundation-win32.png` only after the tests prove the intentional state.

## 6. Exact production write allowlist

Production files:

- `src/app/api/users/me/preferences/route.ts`;
- the seven authenticated JSX files in section 4.2;
- `src/app/layout.tsx`;
- `src/lib/mail/templates.ts`.

Test and visual files:

- `tests/unit/privacy/user-preferences-route.test.ts`;
- `tests/e2e/wave-1-1-privacy.spec.ts`;
- `tests/unit/platform/authenticated-jsx-copy.test.ts`;
- `tests/unit/platform/dashboard-charts.test.tsx`;
- `tests/e2e/rh.spec.ts`;
- `tests/unit/privacy/home-gamification-reachability.test.ts`;
- `tests/e2e/platform-foundation.spec.ts`;
- the desktop foundation snapshot;
- the mobile snapshot only under the condition in section 4.4.

Documentation files:

- this design;
- `docs/superpowers/plans/2026-07-17-uniher-wave-1-1-corrective.md`;
- `docs/qa/2026-07-15-uniher-platform-wave-1-1-scorecard.md`;
- `docs/qa/2026-07-15-uniher-platform-wave-1-scorecard.md`, limited to a forward link.

Any file outside this allowlist requires a stopped task, explicit justification, and supervisor approval before editing.

## 7. Agent orchestration

Implementation agents run sequentially because they share one branch, test database lifecycle, build artifacts, and browser ports. Parallel implementation is prohibited.

Per task:

1. a fresh implementer receives the complete task text and exclusive write set;
2. the implementer follows TDD, runs focused tests, self-reviews, and creates a scoped local commit;
3. a fresh spec reviewer checks the commit only against this design and the task contract;
4. open spec findings return to the same implementer and invalidate the previous review;
5. after spec approval, a fresh quality reviewer checks security, fail-closed behavior, test quality, types, and diff scope;
6. open quality findings return to the implementer and require re-review;
7. the supervisor independently inspects the diff and reruns focused evidence before advancing.

After all tasks, a fresh final reviewer audits the full range from `f398d535` to the candidate code commit.

## 8. Commit architecture

Local commits are scoped and ordered:

1. design specification;
2. executable implementation plan;
3. sparse preferences and first-access regression;
4. authenticated/public/email copy integrity;
5. intentional visual baseline alignment;
6. final Wave 1.1 scorecard and historical forward link.

If a review fix changes code, it creates a new commit and all later review evidence names the new SHA. No push, merge, deploy, or Wave 1.2 work is authorized.

## 9. Final verification gate

Freeze the final non-documentation candidate commit `C`, then run sequentially from the clean corrective worktree:

```powershell
npm run test:unit
npx tsc --noEmit
npm run build
npm run test:wave1.1
npm run test:master
npm run test:seguranca
npm run test:rh
npm run test:colaboradora
npm run test:integrado
Push-Location tests
npx playwright test --config=playwright.config.ts --project=platform-foundation
Pop-Location
```

Run the three static inventories required by the Wave 1.1 plan, classify every hit, then run `git diff --check` and require a clean `git status --short`.

Any skipped or failed command forces `- Decision: FAIL`.

The final scorecard records:

- `- Reviewed code commit: ` followed by the exact SHA `C`;
- `- Decision: PASS` only if every required gate passes;
- exact command counts and results;
- Agenda self-scope and manager/Admin negatives;
- migration and idempotence evidence without sensitive content;
- ranking, points, badges, Semáforo, and health-score quarantine evidence;
- 9/10, complementary, and temporal suppression evidence;
- API, UI, CSV, cache, tenant, role, and payload canaries;
- scheduled report/export inventory;
- visual baseline inspection;
- known non-blocking warnings and debt.

The scorecard commit `D` may change only documentation after `C`. Wave 1.2 may start only from a clean worktree at `D` after its preflight proves `C` is an ancestor and `C..D` contains no non-documentation drift.

## 10. Error handling and safety

- Preference validation fails before opening the write queue.
- `privacy_ranking` remains fail-closed and atomic.
- Browser fixtures restore modified preferences even when assertions fail.
- No screenshots are accepted solely because an update command exits zero; both viewport images require original-resolution inspection.
- No test hides or masks dynamic visual regions.
- The original DSAR change remains untouched in its original worktree.
- Known NFT whole-project trace warnings are recorded and do not become silent success.
- The clean install currently reports 25 dependency advisories, including five high severity. Automatic dependency remediation is outside this approved write set and must not be run as part of this corrective mission; it remains explicit release debt requiring a separate security decision.

## 11. Non-goals

- starting or implementing Wave 1.2 navigation alignment;
- redesigning destination pages or adding missing product panels;
- changing role authorization or entitlements;
- restoring badges, ranking, leagues, points, XP, or health-linked gamification;
- changing stored legacy/quarantine data;
- replacing privacy suppression with fake or seeded dashboard data;
- broad dependency upgrades or automatic `npm audit fix`;
- push, merge, deploy, PR creation, or modification of the original worktree.

## 12. Acceptance criteria

The corrective mission is complete only when:

- first-access and settings sparse preference updates work through the real API;
- invalid and quarantined preference payloads remain atomic and fail closed;
- none of the authenticated route surfaces renders literal Unicode escapes;
- public metadata and reachable email output make no quarantined gamification promise;
- the Admin desktop baseline contains no `Badges` tab and no unrelated visual delta;
- desktop and mobile foundation checks pass;
- every Wave 1.1 static, unit, TypeScript, build, privacy, role, security, integrated, and foundation gate passes on candidate `C`;
- independent spec, quality, and final reviews have no open blocking finding;
- the scorecard records `C` and an evidence-backed decision;
- the corrective worktree is clean after documentation commit `D`;
- no work outside this design has started.
