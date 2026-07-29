# UniHER Paola menu redesign P1A content inventory

**Date:** 2026-07-22
**Lane:** `P1A Existing content reconciliation`
**Decision:** PASS for inventory; SIPAT source remains unverified in this tree

## Harness contract

Intent source: Dra. Paola's menu redesign request, especially the collaborator NR-1 and Viva SIPAT note that content is already available.

Coordinator: current session.

Worker lane: `P1A Existing content reconciliation`.

Write allowlist:

- `docs/superpowers/audits/2026-07-22-uniher-paola-menu-redesign-p1a-content-inventory.md`
- `docs/superpowers/plans/2026-07-22-uniher-paola-menu-redesign-orchestration.md`
- `docs/superpowers/specs/2026-07-22-uniher-paola-menu-redesign-contract.md`
- `docs/superpowers/SESSION_ORCHESTRATION_LEDGER.md`

Write denylist:

- `src/**`
- `data/**`
- `public/**`
- `arquivos_base_inspiracao/**`
- `.next/**`
- production/deploy files
- navigation, route shells and module behavior

Allowed commands:

- `git status --short --branch`
- targeted `rg` over `src`, `public`, `data`, `arquivos_base_inspiracao` and docs
- targeted file reads
- `git diff --check` on docs write set

Stop condition: reconcile what already exists before any P3 shell copies, links or rebuilds NR-1/SIPAT content.

## Inventory result

| Area | Evidence found | Decision impact |
|---|---|---|
| NR-1 collaborator preview | `src/app/(platform)/avaliacao-nr1/page.tsx`, `src/app/(platform)/colaboradora/page.tsx`, `src/lib/nr1/preview-state.ts`, `src/components/copsoq/*`, `src/hooks/useCopsoq.ts`, `src/lib/yavix/*`, `src/app/api/yavix/copsoq/*` | Reuse controlled preview/scaffold; do not rebuild NR-1 from scratch. |
| NR-1 data/contract status | `src/lib/yavix/copsoq.mock.ts`, Yavix/COPSOQ docs and TODO comments identify mock/blocked production wiring | Treat NR-1 as preview/contract-gated, not production Yavix behavior. |
| SIPAT content route | No dedicated `sipat`/`viva sipat` route found under `src/app` | P3 must not claim implemented SIPAT content. |
| SIPAT content assets | No searchable SIPAT materials found in `public`, `data`, `src/lib/db/seeds` or filenames under `arquivos_base_inspiracao` | If content exists, it is outside this tree, inside non-text media, or not named/indexed as SIPAT. |
| Concierge | No dedicated route/content workflow found under `src` | Keep locked shell only until product/data model exists. |
| Canal de Denuncias | `src/lib/participation/eligibility.ts` names `denunciation` only as a sensitive participation-exclusion domain | Keep partner-managed locked shell; do not create report workflow. |
| Desenvolvimento Humano | No dedicated route/content implementation found under `src` | Keep future-fillable locked shell only. |

## Existing NR-1 evidence

NR-1 exists as a controlled preview/scaffold, not as a confirmed production contract:

- `/avaliacao-nr1` renders `CopsoqFlow`.
- `/colaboradora` already exposes `Nr1JourneyRow` behind `NEXT_PUBLIC_UNIHER_NR1_PREVIEW` and `NEXT_PUBLIC_UNIHER_NR1_ENTITLEMENT`.
- `src/lib/nr1/preview-state.ts` centralizes preview state.
- `src/components/copsoq/*`, `src/hooks/useCopsoq.ts`, `src/lib/yavix/copsoq.*` and `/api/yavix/copsoq/*` form the current COPSOQ/Yavix preview/proxy scaffold.
- `src/lib/yavix/copsoq.mock.ts` explicitly says the fixture is not the real validated instrument and that production behavior is blocked until real Yavix wiring.

P3/P4 may link to this only through the existing entitlement/preview gates.

## SIPAT reconciliation

The stakeholder claim that Viva SIPAT content is already available is not validated by this local tree.

Targeted searches did not find:

- a dedicated SIPAT route under `src/app`;
- SIPAT copy/content in `src`, `public`, `data` or `src/lib/db/seeds`;
- filenames under `arquivos_base_inspiracao` that clearly identify SIPAT materials.

Possible explanations:

- the SIPAT content lives outside this checkout;
- the content is inside image/video assets without searchable text;
- the content exists in production/CMS not represented locally;
- the stakeholder meant the product content exists conceptually, not as repo assets.

Implementation rule: do not invent SIPAT lessons, campaigns, videos, schedules or materials. Until the source is provided or confirmed, P3 may create only a locked shell with honest copy, or a source-needed state.

## Loop result

Preflight: confirmed current dirty state and docs-only write policy.

Observe: searched route/content/assets for NR-1, SIPAT, Yavix, COPSOQ, Concierge, Denuncias and Desenvolvimento Humano.

Plan: classify each requested module as reuse, locked shell or source-needed.

Act: wrote this inventory receipt and updated the orchestration/ledger state.

Verify: run `git diff --check` on the Paola docs write set before closeout.

Reflect: NR-1 can be reused as a preview surface, but SIPAT cannot be treated as locally available without external evidence or manual review of unnamed media.

Coordinator gate: P1A is sufficient to start P1 implementation if its code allowlist is opened. P3 shells remain HOLD for content-dependent claims.

## Decision

PASS for docs/inventory.

P1 implementation may start only under the existing module-storage/helper/test allowlist. P3 remains HOLD until either:

- SIPAT source assets/content are provided or located; or
- the coordinator explicitly approves a locked/source-needed SIPAT shell with no invented content.
