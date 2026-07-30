## Decision
PASS

## Scope
- Intent: continue authenticated UniHER recovery by removing rendered technical/spec copy from real collaborator product surfaces.
- Source of truth: current worktree, route source, focused unit/E2E tests, and local authenticated screenshots.
- Allowlist: `/objetivos`, `/desafios`, `/conquistas`, platform navigation copy, focused tests, local evidence screenshots.
- Denylist: public landing, sensitive module activation, NR-1/Yavix/COPSOQ runtime, Liga/rewards/ranking productization, permissions, APIs, database contracts.

## Changes
- `src/app/(platform)/objetivos/page.tsx`
  - Replaced contract/server-event wording with private journey copy.
- `src/app/(platform)/desafios/page.tsx`
  - Replaced privacy receipt/DSAR wording with user-facing private participation copy.
- `src/app/(platform)/conquistas/page.tsx`
  - Replaced contract/ledger/event wording with private milestone copy.
- `src/components/platform/navigation.ts`
  - Replaced navigation contract/governance/gated wording and module badges with product availability states.
- Tests updated:
  - `tests/e2e/platform-product-boundary.spec.ts`
  - `tests/unit/platform/navigation.test.ts`
  - `tests/unit/privacy/gamification-safe-projection.test.ts`

## Verification
- `rg -n "Contrato seguro|Eventos elegiveis|eventos elegiveis|recibos de privacidade|DSAR|ledger elegivel|sem expor historico|Governanca privada|governanca privada|Em breve|Contrato|gated|Yavix|contratad|governado por contrato" ...`
  - PASS: target rendered technical terms = 0.
- `npx vitest run tests/unit/platform/navigation.test.ts tests/unit/privacy/gamification-safe-projection.test.ts tests/unit/personal-objectives.test.ts tests/unit/company-challenges.test.ts tests/unit/private-achievements.test.ts`
  - PASS: 5 files, 60 tests.
- `npx tsc --noEmit`
  - PASS.
- `cd tests; npx playwright test --config=playwright.config.ts --project=platform-product-boundary --grep "useful surface keeps non-competitive privacy copy"`
  - PASS: 5 authenticated useful-surface tests.
- Local authenticated screenshots for `/objetivos`, `/desafios`, `/conquistas`
  - PASS: desktop/mobile captures, forbidden technical terms absent.
- `git diff --check`
  - PASS.
- Landing guard:
  - PASS: `landing_worktree_diff_count=0`.

## Evidence
- `docs/superpowers/evidence/private-journey-copy-wave-local-2026-07-30/desktop-1366-objetivos.png`
- `docs/superpowers/evidence/private-journey-copy-wave-local-2026-07-30/desktop-1366-desafios.png`
- `docs/superpowers/evidence/private-journey-copy-wave-local-2026-07-30/desktop-1366-conquistas.png`
- `docs/superpowers/evidence/private-journey-copy-wave-local-2026-07-30/mobile-390-objetivos.png`
- `docs/superpowers/evidence/private-journey-copy-wave-local-2026-07-30/mobile-390-desafios.png`
- `docs/superpowers/evidence/private-journey-copy-wave-local-2026-07-30/mobile-390-conquistas.png`

## Drift / Risk
- The changed routes keep real APIs and privacy boundaries; no backend behavior was altered.
- Sensitive modules still require fail-closed treatment: NR-1/Yavix/COPSOQ, Concierge, SIPAT, Desenvolvimento Humano, Canal de Denuncias, Liga/ranking/rewards.
- Remaining copy audit should continue against NR-1 preview wording and any authenticated route not yet covered by rendered scans.

## Next Wave
- Smallest next step: audit NR-1 collaborator journey and module-hold copy for rendered preview/spec wording, preserving fail-closed behavior.
- Gate: source canaries, focused E2E redirect/runtime checks, desktop/mobile screenshots, landing denylist diff count 0.
