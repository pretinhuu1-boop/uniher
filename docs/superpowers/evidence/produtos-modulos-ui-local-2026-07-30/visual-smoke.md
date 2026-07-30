# Produtos e Modulos local visual smoke

Date: 2026-07-30

## Result

PASS.

## Scope

- Route: `/produtos-modulos`
- User fixture: RH company-scoped user
- Desktop screenshot: `desktop-1366-produtos-modulos.png`
- Mobile screenshot: `mobile-390-produtos-modulos.png`

## Checks

- Desktop and mobile headings rendered.
- `/api/company/modules` backed surface showed real module rows.
- Sensitive modules rendered with HOLD as the primary visual state.
- Non-sensitive active count excluded sensitive modules.
- No old shell copy such as `Controle administrativo em preparacao`, `Toggle real de ativacao` or `Permanece bloqueado` appeared on this route.
- No horizontal overflow was detected.
- Product boundary test preserved NR-1/Yavix, Liga/ranking/rewards, Denuncias, Concierge, SIPAT and Desenvolvimento Humano gates.

## Command

```powershell
cd tests; npx playwright test --config=playwright.config.ts --project=platform-product-boundary
```

Result: 15 passed.
