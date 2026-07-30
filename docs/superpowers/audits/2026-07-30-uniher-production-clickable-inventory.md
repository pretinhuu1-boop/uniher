# UniHER production clickable inventory

Date: 2026-07-30

## Decision

HOLD for "all buttons work" as a production claim.

The previous authenticated recovery verified rendered routes, route redirects, visual coverage and focused flows. It did not click every production button. This audit creates the first production clickable inventory and classifies which controls are safe to click in production versus which require local/fixture testing because they may mutate data, end a session, destroy access or enter a stateful workflow.

## Scope

- Target: `https://www.uniher.com.br`.
- Commit: `a856440`.
- Profiles: admin, RH, lideranca and colaboradora smoke accounts.
- Routes: authenticated recovery sweep routes plus `/onboarding-rh` and `/primeiro-acesso`.
- Mode: read-only inventory/classification. Mutating or ambiguous controls were intentionally not clicked in production.

## Inventory Result

Evidence:

- `docs/superpowers/evidence/production-clickable-inventory-a856440-2026-07-30T12-38-56-687Z/summary.json`
- `docs/superpowers/evidence/production-clickable-inventory-a856440-2026-07-30T12-38-56-687Z/all-clickables.json`

Summary:

- Routes processed: 76.
- Route errors: 0.
- Visible clickables found: 1,742.
- Unique clickables: 1,570.
- Classified safe to click in production: 1,086.
- Blocked from production click: 656.

Class breakdown:

- `navigation_link`: 860.
- `read_only_ui_control`: 150.
- `in_page_anchor`: 76.
- `unknown_button`: 338.
- `session`: 152.
- `mutation_or_submit`: 87.
- `destructive`: 27.
- `stateful_open_or_mutation_risk`: 27.
- `disabled`: 25.

## Production Click Policy

Allowed in production without extra fixture:

- internal navigation links already covered by route smoke;
- same-page anchors;
- clearly read-only UI toggles such as local navigation/tabs/pagination/view switches.

Not allowed to click in production without a fixture or explicit write-safe protocol:

- create, save, invite, import, approve, publish, submit or reset-password buttons;
- destructive/access-changing buttons such as block, suspend, remove or delete;
- logout/session-ending controls;
- ambiguous buttons with unclear side effects;
- stateful edit/configuration workflows.

## Production Read-Only Click Follow-Up

The first deterministic production read-only lane is complete on commit `1d81c58`.

Evidence:

- `docs/superpowers/evidence/production-readonly-clicks-1d81c58-2026-07-30T12-54-03-826Z/summary.json`
- `docs/superpowers/evidence/production-skip-link-keyboard-1d81c58-2026-07-30T13-07-19-509Z/summary.json`
- Receipt: `docs/superpowers/audits/2026-07-30-uniher-production-readonly-clicks-wave.md`

Result:

- `read_only_ui_control`: 150 PASS / 0 REVIEW / 0 ERROR.
- `in_page_anchor`: 76 PASS / 0 REVIEW / 0 ERROR after keyboard-specific skip-link validation.
- Combined production-safe read-only lane: 226 PASS / 0 REVIEW / 0 ERROR.

This still does not claim button-by-button functional PASS across the whole product because 656 controls remain blocked from production click by policy.

## Next Wave

Run button validation in smaller, deterministic lanes:

1. Local fixture lane: click mutation-capable, stateful, session and ambiguous workflows against a seeded/local database and verify expected API calls and UI states.
2. Production guarded lane: only after local fixture PASS, test non-destructive production workflows that are explicitly reversible or no-op under smoke accounts.

Do not claim "all buttons work" until those lanes produce PASS evidence.
