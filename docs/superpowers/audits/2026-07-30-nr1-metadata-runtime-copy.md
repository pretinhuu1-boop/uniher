# NR-1 metadata copy hardening

Date: 2026-07-30
Commit target: pending

## Decision

LOCAL PASS. Production deploy and post-deploy audit remain pending.

## Scope

- Intent: continue the authenticated no-spec recovery by removing internal implementation wording still shipped in the `/avaliacao-nr1` document metadata.
- Source audit: production authenticated visible/spec audit over 67 role/route combinations at `483157e`.
- Finding: only `/avaliacao-nr1` emitted `runtime` in serialized page metadata after redirect; no rendered final screen showed a spec shell.
- Allowlist: `src/app/(platform)/avaliacao-nr1/page.tsx`, `tests/unit/module-shells.test.ts`, this audit receipt, audit JSON.
- Denylist: public landing, marketing routes, `public`, NR-1 entitlement behavior, Yavix/COPSOQ activation, sensitive modules, permissions and privacy boundaries.

## Changes

- Replaced the NR-1 metadata description with user-facing copy: `Avaliacao NR-1 disponivel conforme liberacao autorizada.`
- Added a unit canary that blocks the old `runtime autorizado` metadata wording.
- Left redirects, entitlement checks, mock runtime guard and `CopsoqFlow` ordering unchanged.

## Verification

- RED: `npm run test:unit -- tests/unit/module-shells.test.ts` failed before the page change on the new metadata canary.
- GREEN: `npm run test:unit -- tests/unit/module-shells.test.ts tests/unit/nr1-runtime-entitlement.test.ts tests/unit/nr1-preview-state.test.ts tests/unit/platform/navigation.test.ts` passed, 4 files / 58 tests.
- E2E: `npx playwright test --config=tests/playwright.config.ts --project=platform-product-boundary` passed, 22/22.
- Typecheck: `npx tsc --noEmit` passed.
- Build: `npm run build` passed.
- Diff check: `git diff --check` passed.
- Landing denylist: `git diff --name-only -- src/app/page.tsx 'src/app/(marketing)' src/components/landing public` returned empty.
- Grep: `runtime autorizado` and the old metadata sentence are absent from `src/app/(platform)/avaliacao-nr1/page.tsx`.
- Claude review: attempted twice; first call timed out, second returned `OAuth access token has been revoked`. No Claude review result was available for this wave before commit.

## Evidence

- `docs/superpowers/evidence/authenticated-visible-spec-audit-483157e-2026-07-30/visible-spec-audit.json`

## Residual Risk

- The pre-change production audit result remains an evidence snapshot from `483157e`; production must be redeployed and re-audited to prove the metadata hit is gone on the live host.
- Claude review remains unavailable until authentication is restored.
- Sensitive NR-1/Yavix product activation remains intentionally blocked outside the approved mock/dev path.
