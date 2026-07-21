# UniHER post-Wave 4 audit and correction plan

**Status:** execution in progress  
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
| F-01 | P0 | AUTO | NR-1 completion writes legacy points, level, activity, badges and notifications and celebrates XP. | Remove the producer and UI reward; prove zero mutation. |
| F-02 | P1 | AUTO | RH/leadership expose Semaforo; RH exposes personal objectives and Liga; collaborator exposes Liga. | Remove gated destinations and add deny-list tests. |
| F-03 | P1 | OUT OF SCOPE | Public landing JSON-LD mentions Liga/Semaforo. | Do not edit in this mission; public and email surfaces are protected. |
| F-04 | P2 | AUTO | `health-score.repository.ts` still exports personal and company readers. | Make every operational reader fail closed; preserve DSAR-only SQL elsewhere. |
| F-05 | P1 | AUTO | Authenticated API/permission docs describe legacy Liga/objective/reward contracts as live. | Align docs and OpenAPI with containment runtime. |
| F-06 | P3 | AUTO | Semaforo error boundary has incorrect copy and collaborator redirect. | Correct copy and return to `/colaboradora`. |
| F-07 | P1 | MANUAL | Wave 5 lacks approved retention, erasure/pseudonymization and audit policy. | Produce a decision packet; no migration until approval. |
| F-08 | P1 | AUTO AFTER F-07 | Wave 5 omits DSAR, deterministic event keys and transaction-safe producer contracts. | Add these to the Wave 5 spec and implementation write set. |
| F-09 | P1 | AUTO | OpenAPI advertises contained legacy badge/challenge/objective APIs as operational. | Add parity regression and document `410` contracts. |
| F-10 | P2 | AUTO | Legacy quarantine omits objective/challenge tables and active writers/counters remain. | Extend containment without deleting preservation/DSAR data. |
| F-11 | P2 | MANUAL | Challenge leave/revocation and achievement revocation lifecycle are underspecified. | Decide versioned reversal semantics before migrations 058/059. |
| F-12 | P2 | MANUAL | Approved catalogs, units, bounds and completion rules are unspecified. | Freeze textual contracts before Waves 6-8 implementation. |

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
