# UniHER production module HOLD redirects smoke

Date: 2026-07-30

Commit deployed: `c1e9109`

Production target: `https://uniher.com.br`

## Result

PASS. The direct authenticated module URLs that still lack approved contracts no longer render spec/HOLD shell copy in production. They redirect to existing useful surfaces by role.

## Evidence

Screenshots:

- `docs/superpowers/evidence/production-module-hold-redirects-c1e9109-2026-07-30/desktop-admin-concierge-to-empresas.png`
- `docs/superpowers/evidence/production-module-hold-redirects-c1e9109-2026-07-30/desktop-admin-denuncias-to-empresas.png`
- `docs/superpowers/evidence/production-module-hold-redirects-c1e9109-2026-07-30/desktop-admin-sipat-to-empresas.png`
- `docs/superpowers/evidence/production-module-hold-redirects-c1e9109-2026-07-30/desktop-admin-dh-to-empresas.png`
- `docs/superpowers/evidence/production-module-hold-redirects-c1e9109-2026-07-30/desktop-rh-nr1-to-produtos-modulos.png`
- `docs/superpowers/evidence/production-module-hold-redirects-c1e9109-2026-07-30/mobile-collab-nr1-to-colaboradora.png`

Verified redirects:

- Admin `/concierge` -> `/admin?tab=empresas`
- Admin `/canal-denuncias` -> `/admin?tab=empresas`
- Admin `/viva-sipat` -> `/admin?tab=empresas`
- Admin `/desenvolvimento-humano` -> `/admin?tab=empresas`
- RH `/nr1` -> `/produtos-modulos`
- Colaboradora `/nr1` -> `/colaboradora`

Negative production check:

- No visible blocked/spec copy matched `Como esta pagina vai funcionar`, `Permanece bloqueado`, `COPSOQ`, `Formulario, caixa de entrada`, or `Cadastro, atribuicao, triagem` in those final surfaces.

Landing guard:

- `GET /api/health`: healthy.
- `HEAD /`: `Last-Modified: Tue, 21 Jul 2026 17:56:04 GMT`, unchanged from the protected landing baseline.
