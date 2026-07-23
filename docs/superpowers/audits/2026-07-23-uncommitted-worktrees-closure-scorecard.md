# UniHER Uncommitted Worktrees Closure Scorecard

**Date:** 2026-07-23
**Source plan:** `docs/superpowers/plans/2026-07-23-uniher-uncommitted-worktrees-end-to-end-closure.md`
**Source audit:** `docs/superpowers/audits/2026-07-23-uncommitted-worktrees-plan-audit.md`
**Coordinator:** current Codex session
**Decision:** PASS WITH EXPLICIT HOLDS

## Current Inventory

Inventory refreshed on 2026-07-23 from `C:/Users/user/Documents/uniher-app-audit`.

| Lane | Worktree | Branch | Dirty State |
|---|---|---|---|
| L1 Root docs cleanup | `C:/Users/user/Documents/uniher-app-audit` | `codex/security-lessons-review` | docs package committed locally as `766648c`; `.superpowers/**` artifacts on HOLD |
| L2 Deploy package fix | `.worktrees/uniher-deploy-package-fix` | `codex/uniher-deploy-package-fix` | committed locally as `dc44ad8` |
| L3 DSAR test hardening | `.worktrees/uniher-platform-wave1` | `codex/uniher-platform-wave1` | committed locally as `bb7f8f7` |
| L4 Wave 2B education repair | `.worktrees/uniher-wave2b-education` | `codex/uniher-wave2b-education` | committed locally as `28404c3` |
| L5 Wave 3 leftover split | `.worktrees/uniher-wave3-collaborator-nr1` | `codex/uniher-wave3-collaborator-nr1` | committed locally as `d9bf690` and `666a119`; CRLF-only noise on HOLD |

## Lane Results

| Lane | Worktree | Decision | Evidence |
|---|---|---|---|
| L1 Root docs cleanup | `C:/Users/user/Documents/uniher-app-audit` | PASS-DOCS-ONLY + HOLD | `766648c docs: audit and plan UniHER worktree closure`; `.superpowers/**` brainstorm runtime artifacts preserved unstaged |
| L2 Deploy package fix | `.worktrees/uniher-deploy-package-fix` | PASS-COMMITTED | `dc44ad8 fix: remove redundant bcryptjs types package`; `tsc` PASS; `next build` PASS with known Turbopack/NFT warning |
| L3 DSAR test hardening | `.worktrees/uniher-platform-wave1` | PASS-COMMITTED | `bb7f8f7 test: harden DSAR export streaming resilience`; focused DSAR PASS 1 file / 8 tests; privacy suite PASS 16 files / 171 tests; `tsc` PASS |
| L4 Wave 2B education repair | `.worktrees/uniher-wave2b-education` | PASS-COMMITTED | `28404c3 fix: contain Wave 2B education boundaries`; education/security boundary PASS 2 files / 22 tests; `tsc` PASS |
| L5 Wave 3 leftover split | `.worktrees/uniher-wave3-collaborator-nr1` | PASS-COMMITTED + HOLD | `d9bf690 fix: handle master admin company profile without company`; `666a119 docs: record Yavix provisioning discovery gate`; company-profile test PASS 1 file / 3 tests; `tsc` PASS; CRLF-only files preserved unstaged |

## Lane Receipts

### L1 Root Docs Cleanup

- Status: PASS-DOCS-ONLY + HOLD
- Allowlist: Markdown docs/specs/plans/audits needed for the UniHER redesign and worktree closure record.
- Denylist: `.superpowers/**/state/*.pid`, `.superpowers/**/state/*.log`, `.superpowers/**/state/*.err`, broad staging.
- Evidence: root docs package was committed locally as `766648c docs: audit and plan UniHER worktree closure` and contains the source audit, closure plan, closure scorecard and pre-existing UniHER redesign plans/specs. `.superpowers/**` content/state artifacts remain untracked because they include preview HTML, logs, PID/state files and stopped-server receipts that require an explicit archival/discard decision.

### L2 Deploy Package Fix

- Status: PASS-COMMITTED
- Allowlist: `package.json`, `package-lock.json`.
- Evidence:
  - Commit: `dc44ad8 fix: remove redundant bcryptjs types package`.
  - Registry/package finding: `bcryptjs@3.0.3` exposes `types: umd/index.d.ts`; `@types/bcryptjs@^3.0.3` does not exist.
  - `npm ls bcryptjs --depth=0`: PASS, `bcryptjs@3.0.3`.
  - `rg` confirmed `@types/bcryptjs` and `node_modules/@types/bcryptjs` absent from `package.json`/`package-lock.json`.
  - `npx tsc --noEmit`: PASS.
  - `npm run build`: PASS, 146 pages; one known Turbopack/NFT warning from `next.config.ts` import trace.

### L3 DSAR Test Hardening

- Status: PASS-COMMITTED
- Allowlist: `tests/unit/privacy/dsar-export-cooldown.test.ts`.
- Evidence:
  - Commit: `bb7f8f7 test: harden DSAR export streaming resilience`.
  - `npm run test:unit -- tests/unit/privacy/dsar-export-cooldown.test.ts`: PASS, 1 file / 8 tests.
  - `npm run test:unit -- tests/unit/privacy`: PASS, 16 files / 171 tests.
  - `npx tsc --noEmit`: PASS.

### L4 Wave 2B Education Repair

- Status: PASS-COMMITTED
- Allowlist: campaign routes/repository, Wave 2B migration, Wave 2B education/security tests, minimal quarantine helper if needed.
- Denylist: NR-1 scoring/result sync, Semaforo activation, Liga/ranking/reward activation, SIPAT content invention.
- Evidence:
  - Commit: `28404c3 fix: contain Wave 2B education boundaries`.
  - Scorecard: `docs/superpowers/audits/2026-07-23-uniher-wave2b-education-boundary-scorecard.md`.
  - `npm run test:unit -- tests/unit/education/campaign-boundary.test.ts tests/unit/security/wave-2b-education-boundary.test.ts`: PASS, 2 files / 22 tests.
  - `npx tsc --noEmit`: PASS.
  - `rg` confirms `LEGACY_LESSON_QUARANTINED` and `LEGACY_GAMIFICATION_COMPLETION_QUARANTINED` in legacy handlers/tests.

### L5 Wave 3 Leftover Split

- Status: PASS-COMMITTED + HOLD
- Allowlist: `src/app/(platform)/company-profile/page.tsx`, focused company-profile tests if needed, `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md`.
- Denylist: CRLF-only normalization bundled with product/research changes; Yavix provisioning implementation or inferred payloads.
- Evidence:
  - Commit: `d9bf690 fix: handle master admin company profile without company`.
  - Commit: `666a119 docs: record Yavix provisioning discovery gate`.
  - `npm run test:unit -- tests/unit/company-profile-page.test.tsx`: PASS, 1 file / 3 tests.
  - `npx tsc --noEmit`: PASS.
  - `docs/superpowers/research/2026-07-21-yavix-public-api-discovery.md` explicitly gates Yavix provisioning as blocked until the current implementation contract is provided.
  - Remaining dirty files `src/app/(platform)/configuracoes/config.module.css` and `src/services/objectives.service.ts` are CRLF-only/no material `--numstat` diff and are intentionally held outside stage.

## Final Gate

- [x] Every lane has terminal state.
- [x] No mixed worktree was staged with unrelated files.
- [x] No denied governance surface was activated.
- [x] Push/PR actions happened only for approved lanes.
- [x] Remaining HOLD/BLOCKED items have explicit owner and next action.

## Remaining Holds

| Hold | Owner | Next Action |
|---|---|---|
| L1 `.superpowers/**` brainstorm preview/runtime artifacts | Operator | Decide whether to archive selected HTML previews as a separate artifact package or discard runtime state/log/PID files. |
| L5 CRLF-only files `src/app/(platform)/configuracoes/config.module.css` and `src/services/objectives.service.ts` | Operator | Normalize in a dedicated formatting cleanup only if desired; do not bundle with product or research commits. |

## Ledger Note

`docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md` was not present in the root checkout during this closure pass, so this scorecard is the local durable ledger for the five-lane cleanup.
