## Decision
PASS

## Scope
- Intent: continue authenticated UniHER recovery until rendered screens stop showing specs/placeholders when a real product surface exists.
- Source of truth: current worktree, authenticated route code, focused unit/E2E checks, and generated screenshots.
- Allowlist: authenticated platform product copy for `/comunidade/gerenciar` and `/produtos-modulos`; focused tests and route screenshots.
- Denylist: public landing, public assets outside evidence, permission logic, sensitive module activation, NR-1/Yavix/COPSOQ runtime, Liga/rewards/ranking productization, Concierge/SIPAT/DH/Denuncias intake.

## Changes
- `src/components/community/management/CommunityPostEditor.tsx`
  - Replaced visible preview wording with operational editorial review copy.
  - Replaced technical helper copy for text/image fields with product-facing editorial wording.
- `src/app/(platform)/produtos-modulos/page.tsx`
  - Replaced rendered wave/contract/governance jargon with product availability copy.
  - Kept sensitive products protected and non-sensitive edits restricted to Master Admin.
- `tests/unit/community-management-workspace.test.ts`
  - Added a canary against old visible preview wording and technical editor helper copy.
- `tests/unit/module-shells.test.ts`
  - Added a canary against `Limite desta wave` and updated expected product copy.
- `tests/e2e/community-feed.spec.ts`
  - Updated the editorial workflow heading expectation.
- `tests/e2e/platform-product-boundary.spec.ts`
  - Updated product-boundary anchors and screenshot smoke expectations.

## Verification
- `rg -n "Limite desta wave|Estados reais do contrato|Bloqueado por contrato|Auditoria tecnica|Governanca de modulos|Requer contrato|Previa em texto simples|visualizar a previa" ...`
  - PASS: target rendered source old terms = 0.
- `npx vitest run tests/unit/module-shells.test.ts tests/unit/company-modules.test.ts tests/unit/company-modules-api.test.ts tests/unit/community-management-workspace.test.ts tests/unit/community-management-page.test.tsx`
  - PASS: 5 files, 40 tests.
- `cd tests; npx playwright test --config=playwright.config.ts --project=community-feed --grep "browser covers RH management states"`
  - PASS: 1 test, full editorial workflow.
- `cd tests; npx playwright test --config=playwright.config.ts --project=platform-product-boundary --grep "RH visual smoke captures Produtos"`
  - PASS: 1 test, desktop/mobile screenshots, no horizontal overflow.
- Production authenticated rendered scan for `/produtos-modulos` and `/comunidade/gerenciar`
  - PASS: desktop/mobile screenshots, required anchors present, old spec/preview terms absent, no HTTP 5xx responses.
- `npx tsc --noEmit`
  - PASS.
- `git diff --check`
  - PASS.
- Landing guard:
  - PASS: `landing_worktree_diff_count=0`.

## Evidence
- `docs/superpowers/evidence/produtos-modulos-ui-local-2026-07-30/desktop-1366-produtos-modulos.png`
- `docs/superpowers/evidence/produtos-modulos-ui-local-2026-07-30/mobile-390-produtos-modulos.png`
- `docs/superpowers/evidence/production-authenticated-product-copy-d240565-2026-07-30/desktop-1366-rh-produtos-modulos.png`
- `docs/superpowers/evidence/production-authenticated-product-copy-d240565-2026-07-30/mobile-390-rh-produtos-modulos.png`
- `docs/superpowers/evidence/production-authenticated-product-copy-d240565-2026-07-30/desktop-1366-rh-comunidade-gerenciar.png`
- `docs/superpowers/evidence/production-authenticated-product-copy-d240565-2026-07-30/mobile-390-rh-comunidade-gerenciar.png`

## Drift / Risk
- Remaining rendered-copy gaps identified by the read-only sidecar:
  - NR-1 collaborator journey still uses preview terminology when the preview env is enabled. Keep fail-closed until contract/source gates are proven.
  - Objetivos, Desafios and Conquistas use safe but technical privacy/contract wording that should be rewritten as user-facing product copy.
  - Navigation badges still include roadmap/contract-style states such as `Em breve` and `Contrato`.
  - Gamification rewards/league components remain latent and must not be reintroduced as ranking/rewards product without explicit contract.

## Next Wave
- Smallest next step: rewrite Objetivos/Desafios/Conquistas and navigation badges from technical contract/privacy copy into product-language copy while preserving privacy and non-ranking gates.
- Gate: focused source canaries, unit tests covering private gamification/product copy boundaries, visual smoke for affected routes, landing denylist diff count 0.
