## Decision
PASS

## Scope
- Intent: restore one concrete product gap from the older UniHER platform without reopening unsafe competitive gamification.
- Source of truth: current backend contract at `/api/rh/lessons`; legacy route diff `d085104..HEAD` showing `/gamificacao-config` was reduced to a review page.
- Allowlist: `/gamificacao-config`, gamification privacy/boundary tests, this receipt, and local visual smoke evidence.
- Denylist: public landing pages, VPS deploy, `/api/gamification/rewards`, `/api/gamification/league`, score/ranking/reward writes, NR-1/Yavix behavior.

## Changes
- Replaced the blocked `/gamificacao-config` review page with an RH educational lesson manager.
- The page now lists, filters, creates, edits, validates, and deletes educational lessons through `/api/rh/lessons`.
- Read-only lessons no longer show edit/delete actions.
- `/api/rh/lessons` GET is read-only; automatic weekly reflection provisioning was removed from the read path.
- RH lesson create/update now rejects nested legacy competitive fields or claims inside `content_json`.
- Competitive controls remain absent: no score, ranking, reward store, reward redemption, league promotion, or legacy reward endpoint call.

## Verification
- `npx vitest run tests/unit/privacy/gamification-write-containment.test.ts tests/unit/privacy/gamification-product-copy-boundary.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts --reporter=default`
  - PASS: 5 files, 76 tests.
- `npx tsc --noEmit --pretty false`
  - PASS.
- `npm run build`
  - PASS.
- Local production visual smoke with `next start`, RH seed account, desktop 1366 and mobile 390:
  - Evidence: `docs/superpowers/evidence/gamificacao-config-local-start-2026-07-29T23-42-38-333Z/`
  - PASS: no horizontal overflow, no console errors, `readonlyButtons=0`, `mutatedByView=false`.
- Independent code review:
  - PASS for local commit after correcting the GET mutation and content-guard concerns.

## Drift / Risk
- This closes only the educational lesson gap inside the legacy gamification area.
- Liga, rewards, score/ranking, and prize/redeem workflows remain intentionally blocked until governance/product contracts are explicit.
- Production VPS remains at the previous deployed commit until this branch is pushed and deployed.

## Next Wave
- Restore the next safe product gap by the same rule: prove a real backend contract exists, rebuild only the bounded UI, keep unsafe legacy mechanics gated, and verify visually.
