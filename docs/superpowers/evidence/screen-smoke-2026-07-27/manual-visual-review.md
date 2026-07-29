# UniHER screen-by-screen visual smoke - manual review

Generated: 2026-07-27

Scope:
- Desktop and mobile screenshots for 60 authenticated screens.
- Roles: admin, RH/admin empresa, colaboradora.
- Evidence folder: `docs/superpowers/evidence/screen-smoke-2026-07-27`.
- Sidebar-open evidence reviewed from `wave3-mobile-*-sidebar.png`.

Automated smoke result:
- 60 screenshots generated.
- 60 PASS by structural smoke checks.
- 0 WARN, 0 FAIL by route/auth/image/overflow checks.
- 13 console errors were still captured at report level and must not be ignored.

Manual findings:

| Severity | Finding | Evidence | Notes |
|---|---|---|---|
| P1 | Mobile bottom navigation overlaps important content on main collaborator/RH screens. | `mobile-colab-home.png`, `mobile-rh-dashboard.png` | The fixed nav sits over journey/dashboard content in full-page capture. Add enough mobile bottom padding/scroll-margin where fixed nav is present and verify first actionable blocks remain unobstructed. |
| P1 | Mobile sidebar footer covers menu content before the user reaches the end of the navigation. | `wave3-mobile-admin-sidebar.png`, `wave3-mobile-rh-sidebar.png`, `wave3-mobile-colaboradora-sidebar.png` | Admin loses lower items around Gamificacao; colaboradora loses lower account/module items. Make drawer body the scrolling region and reserve footer height with bottom padding. |
| P1 | Admin dashboard renders `undefined KB` for database size. | `desktop-admin-visao-geral.png`, `mobile-admin-visao-geral.png` | The UI expects `db_size_kb`, but the rendered data path can receive a payload without that field. Add a safe formatter/fallback and align response mapping. |
| P2 | RH dashboard department rows concatenate label and privacy message. | `desktop-rh-dashboard.png`, `mobile-rh-dashboard.png` | Example: `OperacoesDados insuficientes...`. Add spacing/layout separation between department name and suppression message. |
| P2 | Sidebar text density/truncation is still heavier than the reference plan. | Desktop and mobile sidebars for admin/RH/colaboradora | CSS is no longer broken, but long labels/details still clamp too aggressively. The reference asks for large readable items with less excessive truncation. |
| P2 | Mobile drawer width/backdrop composition is visually inconsistent with the reference. | `wave3-mobile-*-sidebar.png` | The drawer leaves a narrow dark strip at the right and reads as an almost-full overlay. Normalize drawer width/backdrop and radius/shadow behavior per role. |
| P2 | Console errors remain in the visual smoke run. | `screen-smoke-report.md`, `screen-smoke-report.json` | Admin desktop/mobile captured repeated 403 resource errors and a `TypeError: Cannot read properties of undefined (reading 'length')`. The automated route status still passed, so this needs a separate console-error gate. |

Screen coverage:
- Admin desktop/mobile: `/admin`, `/admin?tab=empresas`, `/admin?tab=usuarios`, `/admin?tab=admin`, `/admin?tab=sistema`, `/produtos-modulos`, `/analytics-emails`, `/saude-primaria`, `/concierge`, `/historico`, `/comunidade/gerenciar`, `/gamificacao-config`.
- RH desktop/mobile: `/dashboard`, `/colaboradoras-gestao`, `/departamentos`, `/convites`, `/campanhas`, `/company-profile`, `/notificacoes`, `/saude-primaria`, `/gamificacao-config`.
- Colaboradora desktop/mobile: `/colaboradora`, `/semaforo`, `/agenda`, `/comunidade`, `/conquistas`, `/campanhas`, `/nr1`, `/notificacoes`, `/configuracoes`.

Decision:
- Not ready for visual approval.
- Functional route smoke is green, but visual/UX polish still has P1 findings.
