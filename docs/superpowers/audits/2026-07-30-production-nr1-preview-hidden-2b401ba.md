# UniHER production NR-1 preview hidden smoke

Date: 2026-07-30

Runtime commit deployed: `2b401ba`

Production target: `https://uniher.com.br`

## Result

PASS. `/avaliacao-nr1` no longer exposes a technical preview or unavailable NR-1 card in production when the controlled runtime is not active.

## Evidence

Screenshot:

- `docs/superpowers/evidence/production-nr1-preview-hidden-2b401ba-2026-07-30/mobile-collab-avaliacao-nr1-to-colaboradora-no-nr1-card.png`

Verified route:

- Colaboradora `/avaliacao-nr1` -> `/colaboradora`

Negative visible-text check:

- No visible text matched `Avaliacao NR-1`, `Preview tecnico restrito`, `Previa indisponivel`, `Runtime Yavix indisponivel`, `permanece bloqueado fora de dev/test`, or `COPSOQ`.

Landing guard:

- `GET /api/health`: healthy.
- `HEAD /`: `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`, unchanged from the protected landing baseline.
