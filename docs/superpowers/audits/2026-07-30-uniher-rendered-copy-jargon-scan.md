# UniHER rendered copy jargon scan

Date: 2026-07-30
Branch: codex/uniher-wave3-collaborator-nr1

## Decision

PASS pending deploy.

## Scope

- Intent: continue the authenticated no-spec recovery goal by removing visible jargon found in rendered production screens.
- Allowlist: collaborator management import copy, community feed header copy, focused unit tests, this receipt.
- Denylist: public landing, public assets, auth/permission logic, APIs, NR-1/Yavix/COPSOQ, module contracts, ranking/rewards behavior.

## RED observation

Production rendered text scan over authenticated routes found two visible copy issues:

- RH `/colaboradoras-gestao`: `Preview mascarado antes da gravação`.
- Collaborator `/comunidade`: `Sem comentários, ranking ou dados de saúde`.

These were not broken shells, but they kept spec/legacy vocabulary visible in real product surfaces.

## Changes

- RH spreadsheet import copy now says `Conferência mascarada antes da gravação` and `Conferência segura`.
- Community header now says `Sem comentários, exposição pública ou dados de saúde`.
- Added focused unit canaries for both copies.

## Verification

- `npx vitest run tests/unit/employee-import-ui.test.ts tests/unit/community-feed-ui.test.tsx` -> PASS, 15 tests.
- `git diff --check` -> PASS.
- `npx tsc --noEmit` -> PASS.
- `npm run build` -> PASS.
- Landing denylist diff count -> 0.
- GitHub push -> `12e78ea`.
- VPS deploy -> `12e78ea`.
- VPS `npm run check:release-env` -> PASS 9, HOLD 0, FAIL 0.
- Production landing header -> `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`.
- Production `/api/health` -> healthy.
- Production rendered text rescan:
  - RH `/colaboradoras-gestao` shows `Conferência mascarada antes da gravação`; no `Preview mascarado`, `Prévia segura`, `Preview`, `spec` or `placeholder`.
  - Collaborator `/comunidade` shows `Sem comentários, exposição pública ou dados de saúde`; no `ranking`, `leaderboard`, `Preview`, `spec` or `placeholder`.
- Production screenshots:
  - `docs/superpowers/evidence/production-copy-jargon-12e78ea-rh-colaboradoras-gestao.png`
  - `docs/superpowers/evidence/production-copy-jargon-12e78ea-colaboradora-comunidade.png`
