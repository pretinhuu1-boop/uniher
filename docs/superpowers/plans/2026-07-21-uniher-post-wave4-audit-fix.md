# UniHER post-Wave 4 audit and correction plan

**Status:** automatic corrections complete; manual approvals pending
**Scope:** authenticated internal platform only
**Source of truth:** `2026-07-21-uniher-pending-surfaces-orchestration.md`

## Promotion decision

Wave 4 is complete. Waves 5-8 remain closed until their foundations pass the
gates below. Wave 9 remains behind a product/privacy decision and Wave 10 is
hard blocked by product/legal policy. No legacy gamification or health data may
be reactivated to make a placeholder look functional.

## Pre-wave scorecard

| Area | Result | Decision |
| --- | --- | --- |
| Wave 4 community | PASS | Keep promoted |
| Legacy write containment | FAIL | Fix before Wave 5 |
| Navigation against approved gates | FAIL | Fix before new UI work |
| Semaforo read containment | FAIL | Fix exported readers now |
| Runtime/docs parity | FAIL | Correct authenticated docs and OpenAPI |
| Wave 5 participation contract | BLOCKED | Retention, erasure and producer contracts required |
| Waves 6-8 | NOT READY | Execute serially after Wave 5 PASS |
| Wave 9 Semaforo | MANUAL GATE | Product/privacy approval required |
| Wave 10 Liga | HARD BLOCK | Product/legal policy and Waves 5/8 required |

## Findings ledger

| ID | Severity | Class | Finding | Correction and gate |
| --- | --- | --- | --- | --- |
| F-01 | P0 | FIXED | NR-1 completion writes legacy points, level, activity, badges and notifications and celebrates XP. | Removed producer/UI reward; regression proves containment. |
| F-02 | P1 | FIXED | RH/leadership expose Semaforo; RH exposes personal objectives and Liga; collaborator exposes Liga. | Removed gated destinations and added deny-list tests. |
| F-03 | P1 | OUT OF SCOPE | Public landing JSON-LD mentions Liga/Semaforo. | Do not edit in this mission; public and email surfaces are protected. |
| F-04 | P2 | FIXED | `health-score.repository.ts` still exports personal and company readers. | All operational readers fail closed; DSAR-only SQL remains separate. |
| F-05 | P1 | FIXED | Authenticated API/permission docs describe legacy Liga/objective/reward contracts as live. | Docs and OpenAPI now match containment runtime. |
| F-06 | P3 | FIXED | Semaforo error boundary has incorrect copy and collaborator redirect. | Copy corrected; return points to `/colaboradora`. |
| F-07 | P1 | MANUAL PACKET READY | Wave 5 lacks approved retention, erasure and audit policy. | Decision packet published; no migration until approval. |
| F-08 | P1 | MANUAL PACKET READY | Wave 5 omits DSAR, deterministic event keys and transaction-safe producer contracts. | Decision packet now defines DSAR, mutation-safe idempotency and transaction boundaries; implementation waits for F-07 approval. |
| F-09 | P1 | FIXED | OpenAPI advertises contained legacy badge/challenge/objective APIs as operational. | Parity regression covers methods and `410` contracts. |
| F-10 | P2 | FIXED | Legacy quarantine omits objective/challenge tables and active writers/counters remain. | Migration 055, seed and operational counter containment completed. |
| F-11 | P2 | MANUAL PACKET READY | Challenge leave/revocation and achievement revocation lifecycle are underspecified. | Recommended versioned reversals await approval. |
| F-12 | P2 | MANUAL PACKET READY | Approved catalogs, units, bounds and completion rules are unspecified. | Recommended textual contracts await approval. |

## Execution order

1. Contain NR-1 legacy rewards (`F-01`) and commit focused tests.
2. Correct authenticated navigation (`F-02`) and Semaforo operational reads/error state (`F-04`, `F-06`).
3. Repair docs/OpenAPI/quarantine drift (`F-05`, `F-09`, `F-10`).
4. Publish the Wave 5 privacy and lifecycle decision packet (`F-07`, `F-11`, `F-12`).
5. After explicit approval, implement Wave 5 serially: migration 056, strict participation domain, DSAR and tests.
6. Implement Waves 6, 7 and 8 serially, each with focused tests, full privacy gates and desktop/mobile screenshots.
7. Re-audit all findings, run the full unit/build/integrated matrix twice, update receipts and push the existing draft PR.

## Immutable boundaries

- No reads or writes from new domains to `users.points`, `users.level`,
  `user_leagues`, `custom_league_members`, `user_badges`, `activity_log`, legacy
  `mission_logs`, legacy objective/challenge progress or `health_scores`.
- No company, RH or leadership access to personal objective/Semaforo progress.
- No Liga navigation or API reactivation before the Wave 10 policy gate.
- No public landing, metadata or email changes in this correction mission.
- Migration 055 extends legacy quarantine. Migrations 056-059 execute serially
  and only after the preceding gate passes.

## Post-wave closeout

| Gate | Result | Evidence |
| --- | --- | --- |
| Automatic findings | PASS | F-01, F-02, F-04, F-05, F-06, F-08, F-09 and F-10 corrected. |
| Unit suite | PASS | 52 files, 472 tests. |
| TypeScript | PASS | `npx tsc --noEmit`. |
| Production build | PASS | Turbopack compiled and generated 137 pages/routes in an isolated worktree. |
| Contract review | PASS | Independent reviewer accepted OpenAPI, Semaforo, Wave 5-10 and lifecycle alignment. |
| Runtime review | PASS | Independent reviewer accepted NR-1, navigation, Semaforo and collaborator-home containment. |
| Diff hygiene | PASS | `git diff --check cf2c873..HEAD`. |
| Protected scope | PASS | No public landing, metadata or email template changed. |

The build retains the known NFT tracing warning from
`next.config.ts -> src/app/api/admin/system/ops/route.ts`; it does not fail the
build and was not introduced by this correction wave.

F-07, F-11 and F-12 remain intentional manual gates. No migration 056-059 and
no Objectives, Challenges, Achievements, Semaforo or Liga activation may begin
until the corresponding product, privacy, clinical or legal decisions are
explicitly approved. The local NR-1 meeting preview uses `YAVIX_MOCK=1`; it is
not a real Yavix integration, laudo or compliance proof.
