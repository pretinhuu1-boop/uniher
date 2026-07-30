# UniHER production read-only clickable smoke

Date: 2026-07-30

## Decision

PASS for the production read-only clickable lane.

This is not an "all buttons work" claim. It validates only the controls classified as safe for production interaction: read-only UI controls and same-page skip links. Mutating, destructive, session-ending, disabled, ambiguous and stateful controls remain HOLD for local/fixture validation.

## Scope

- Target: `https://www.uniher.com.br`.
- Commit under test: `1d81c58`.
- Profiles: admin, RH, lideranca and colaboradora smoke accounts.
- Routes: 76 authenticated routes from the clickable inventory.
- Allowed production actions: read-only controls, same-page skip links and internal non-mutating interaction.
- Denylist preserved: no landing changes, no mutating/destructive/session clicks in production, no sensitive workflow activation.

## Evidence

Read-only UI controls:

- Evidence: `docs/superpowers/evidence/production-readonly-clicks-1d81c58-2026-07-30T12-54-03-826Z/summary.json`
- Scope: `read_only_ui_control` plus initial mouse attempt for `in_page_anchor`.
- Result: 226 total, 150 PASS, 0 REVIEW, 76 ERROR.
- Interpretation: the 76 errors were all `a[href="#main-content"]` skip links. They failed because the mouse-click harness attempted to click an `sr-only` link outside the viewport. That is a harness-method limitation for keyboard-first accessibility links, not enough by itself to classify product failure.

Keyboard skip links:

- Evidence: `docs/superpowers/evidence/production-skip-link-keyboard-1d81c58-2026-07-30T13-07-19-509Z/summary.json`
- Scope: `a[href="#main-content"]` activated by focus + Enter.
- Result: 76 total, 76 PASS, 0 REVIEW, 0 ERROR.
- Role breakdown: admin 23 PASS, RH 24 PASS, lideranca 7 PASS, colaboradora 22 PASS.

Combined read-only lane:

- `read_only_ui_control`: 150 PASS / 0 REVIEW / 0 ERROR.
- `in_page_anchor`: 76 PASS / 0 REVIEW / 0 ERROR after keyboard-specific validation.
- Combined validated production-safe interactions in this lane: 226 PASS / 0 REVIEW / 0 ERROR.

## Guardrails

- Production was used only for read-only interaction.
- Buttons classified as `mutation_or_submit`, `destructive`, `session`, `stateful_open_or_mutation_risk`, `unknown_button` and `disabled` were not clicked in production.
- Landing guard: `landing_worktree_diff_count=0` before receipt creation.
- Sensitive modules remain fail-closed: NR-1/Yavix/COPSOQ, Concierge, SIPAT, Desenvolvimento Humano, Canal de Denuncias and Liga/ranking/rewards.

## Remaining Work

The clickable inventory still has 656 controls that cannot be certified from production read-only testing:

- `unknown_button`: 338.
- `session`: 152.
- `mutation_or_submit`: 87.
- `destructive`: 27.
- `stateful_open_or_mutation_risk`: 27.
- `disabled`: 25.

Next lane: local/fixture button validation grouped by module and risk class, with expected UI state/API assertions and no production data mutation.
