# UniHER Paola doc-tree next-gates correction plan

**Date:** 2026-07-23
**Status:** executed
**Lane:** Paola P0/P1/P1A/doc-tree
**Current decision:** PASS with P3 docs finding
**Finding source:** separate Paola docs audit session

## Findings

P3:

- `SESSION_ORCHESTRATION_LEDGER.md` still points `paola-doc-tree-validation` to `P1 implementation allowlist or P1A inventory`, although P1/P1A are already closed/superseded.
- `2026-07-22-uniher-paola-doc-tree-validation.md` contains historical route-inventory statements that are now superseded by later shell creation.

These do not invalidate the docs PASS because the historical doc is marked superseded, but they can confuse a new session.

## Harness

**Write allowlist:**

- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`
- `docs/superpowers/audits/2026-07-22-uniher-paola-doc-tree-validation.md`

**Write denylist:**

- no source code changes
- no scorecard decision rewrite beyond next-gate/staleness clarification
- no runtime approval claims

## Tasks

- [x] Update ledger `paola-doc-tree-validation` next action to `closed; superseded by P1/P1A/P3/P4A/P4/P7A/F0`.
- [x] Add a short note to doc-tree validation: route inventory was historical and later superseded by P3 shells.
- [x] Confirm docs still say SIPAT content-bearing implementation remains source-gated.
- [x] Confirm docs still separate `SPEC CAPTURED` from runtime completion.

## Execution Receipt

- Ledger next gate now closes `paola-doc-tree-validation` as superseded.
- Doc-tree validation now says the route/content inventory was historical.
- `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md` still separates `SPEC CAPTURED` from runtime status.
- SIPAT content-bearing implementation remains source-gated.

## Verification

Run:

```powershell
Select-String -Path docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md -Pattern "P1 implementation allowlist or P1A inventory"
git diff --check -- docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md docs/superpowers/audits/2026-07-22-uniher-paola-doc-tree-validation.md
```

The first command should return no active next-gate row after correction.

## Pass Gate

- No current ledger row instructs reopening closed P1/P1A work.
- Historical route inventory is clearly marked as superseded.
