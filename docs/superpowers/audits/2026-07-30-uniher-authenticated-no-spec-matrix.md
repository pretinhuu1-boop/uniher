# UniHER authenticated no-spec matrix

Date: 2026-07-30

## Decision

PASS for the matrix gate.

This artifact closes the active prerequisite from `docs/superpowers/plans/2026-07-30-uniher-no-specs-authenticated-recovery-goal.md`: before the next product edit, keep a global route x role x decision x contract x visual gate matrix for authenticated screens.

This is not final product completion. It is the coordinator map for the next implementation waves.

## Scope

- Intent: continue the authenticated no-spec recovery without touching the public landing or activating sensitive modules.
- Source of truth: `src/app/(platform)`, `src/components/platform/navigation.ts`, compatibility redirect pages, `ModuleHoldRedirect`, focused unit tests and visual route list.
- Write allowlist for this wave: this audit file only.
- Write denylist: `src/app/page.tsx`, `src/components/landing`, `src/app/(public)`, `public`, authenticated product runtime, APIs, permissions, database contracts, NR-1/Yavix/COPSOQ, Concierge, Denuncias, SIPAT, DH, Liga/ranking/rewards.

## Preflight Evidence

- Branch: `codex/uniher-wave3-collaborator-nr1`.
- Current commit at start of matrix wave: `f2da6c0`.
- `rg --files "src/app/(platform)" -g "page.tsx"` found 32 authenticated page routes.
- `src/components/platform/navigation.ts` defines base navigation for `admin`, `rh`, `lideranca` and `colaboradora`, with runtime-ready module navigation disabled for `concierge`, `nr1`, `sipat`, `human_development` and `denunciation`.
- `tests/e2e/visual-ux.spec.ts` currently lists 48 route/role visual smoke entries including compatibility redirects.
- `tests/unit/module-shells.test.ts` and `tests/e2e/platform-product-boundary.spec.ts` cover the sensitive shell and compatibility redirect boundaries.
- Source scan note: `placeholder` in the source is mostly form input helper text and must not be treated as a screen placeholder by itself.

## Matrix

| Route | Role / scope | Current decision | Recoverable product source | Forbidden rendered terms | Contract / governance | Visual gate / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `/admin` | admin | PASS_REAL_PRODUCT | Admin master dashboard and tabs | `spec`, `placeholder screen`, `em revisao`, `ContainedSurfacePreview` | approved admin platform | `visual-ux`: admin-visao-geral plus admin tab routes |
| `/admin?tab=empresas` | admin | PASS_REAL_PRODUCT | Company/admin management tab | `spec`, `placeholder screen`, `em revisao` | approved admin platform | `visual-ux`: admin-empresas and module redirect targets |
| `/admin?tab=usuarios` | admin | PASS_REAL_PRODUCT | User permission management tab | `spec`, `placeholder screen`, `em revisao` | approved admin platform | `visual-ux`: admin-usuarios |
| `/admin?tab=admin` | admin | PASS_REAL_PRODUCT | UniHER admin management tab | `spec`, `placeholder screen`, `em revisao` | approved admin platform | `visual-ux`: admin-master |
| `/admin?tab=sistema` | admin | PASS_REAL_PRODUCT | System settings tab | `spec`, `placeholder screen`, `em revisao` | approved admin platform | `visual-ux`: admin-sistema |
| `/analytics-emails` | admin | PASS_REAL_PRODUCT | Protected communication analytics API | `spec`, `placeholder screen`, raw PII, email body detail | safe existing aggregate reporting | `visual-ux`: admin-relatorios; unit report/privacy tests |
| `/dashboard` | rh, lideranca | PASS_REAL_PRODUCT | Protected company/team dashboard view model | `spec`, `placeholder screen`, raw individual health data | approved aggregate dashboard | `visual-ux`: rh-dashboard, lideranca-dashboard |
| `/dashboard?section=saude-primaria` | admin, rh, lideranca | PASS_REAL_PRODUCT | Dashboard primary-health section | `spec`, `placeholder screen`, clinical individual claims | clinical/aggregate gate | `visual-ux`: admin-saude-primaria, rh-saude-primaria |
| `/dashboard?section=exames` | admin, rh, lideranca | PASS_REAL_PRODUCT | Dashboard exams section | `spec`, `placeholder screen`, dedicated history shell text | safe existing aggregate/report section | `visual-ux`: admin-historico; `/historico` redirect tests |
| `/saude-primaria` | all authenticated | COMPAT_REDIRECT | Admin/RH/Lideranca to `/dashboard?section=saude-primaria`; colaboradora to `/semaforo` | `ContainedSurfacePreview`, static unavailable text | missing standalone route; safe consolidated surfaces exist | `tests/unit/module-shells.test.ts` |
| `/semaforo` | colaboradora | PASS_REAL_PRODUCT | Collaborator self-care/primary-health surface | `score`, `ranking`, `pontos`, `XP`, emergency-care claims | privacy/clinical containment | `visual-ux`: colab-semaforo; `tests/unit/privacy/semaforo-containment.test.ts` |
| `/colaboradora` | colaboradora | PASS_REAL_PRODUCT | Collaborator home, private journey, campaigns and check-in | `pontuacao`, `classificacao`, `ranking`, `liga`, `review banner`, `Previa indisponivel` | safe existing collaborator home; NR-1 row gated | `visual-ux`: colab-home; platform boundary screenshots |
| `/agenda` | colaboradora | PASS_REAL_PRODUCT | Exam agenda product | `spec`, `placeholder screen`, fake scheduling claims | safe existing collaborator agenda | `visual-ux`: colab-agenda |
| `/comunidade` | colaboradora | PASS_REAL_PRODUCT | Company-scoped community/education feed | `spec`, `placeholder screen`, `ranking`, public exposure claims | approved community privacy model | `visual-ux`: colab-comunidade; community tests |
| `/comunidade/gerenciar` | admin, rh | PASS_REAL_PRODUCT | Community editorial management | `spec`, `placeholder screen`, `Preview mascarado`, `Previa segura` | safe existing editorial workflow | `visual-ux`: admin-educacao, rh-gestao-editorial; production copy smoke |
| `/campanhas` | rh, lideranca, colaboradora | PASS_REAL_PRODUCT | Campaigns and education product | `spec`, `placeholder screen`, ranking/reward claims | approved education/campaigns surface | `visual-ux`: rh-campanhas, lideranca-campanhas, colab-campanhas |
| `/gamificacao-config` | admin, rh | COPY_FIX | Existing education lesson editor plus private objectives/challenges admin surface | `governanca privada`, `spec`, `placeholder screen`, `ranking`, `recompensas`, `XP`, `liga` | safe existing editor; ranking/rewards HOLD | `visual-ux`: admin-gamificacao, rh-gamificacao; next wave candidate |
| `/objetivos` | colaboradora | PASS_REAL_PRODUCT | Personal objectives product | `Contrato seguro`, `eventos elegiveis`, `DSAR`, `ledger`, `sem expor historico`, `spec` | safe private journey | platform product boundary; production screenshots at `production-private-journey-copy-6317adb-2026-07-30` |
| `/desafios` | colaboradora | PASS_REAL_PRODUCT | Company challenges product | `Contrato seguro`, `recibos de privacidade`, `DSAR`, `ranking`, `liga`, `spec` | safe voluntary/private participation | platform product boundary; production screenshots at `production-private-journey-copy-6317adb-2026-07-30` |
| `/conquistas` | colaboradora | PASS_REAL_PRODUCT | Private achievements product | `Contrato seguro`, `ledger elegivel`, `DSAR`, `ranking`, `badges`, `liga`, `spec` | safe private journey | platform product boundary; production screenshots at `production-private-journey-copy-6317adb-2026-07-30` |
| `/desafios/gerenciar` | admin, rh, lideranca, colaboradora | COMPAT_REDIRECT | Admin/RH to `/gamificacao-config`; lideranca to `/campanhas`; colaboradora to `/desafios` | `Gestao de desafios em revisao`, `FeedbackState`, `LEGACY_GAMIFICATION_STATE`, ranking/rewards | governed challenge admin missing | `tests/unit/module-shells.test.ts`; platform boundary screenshots |
| `/liga` | admin, rh, lideranca, colaboradora | COMPAT_REDIRECT | Admin/RH to `/gamificacao-config`; lideranca to `/campanhas`; colaboradora to `/conquistas` | `Liga em revisao`, leaderboard, ranking, points, rewards, XP | Liga/ranking/rewards HOLD_PRIVACY_PRODUCT | `tests/unit/module-shells.test.ts`; `platform-product-boundary`; `visual-ux` |
| `/liga/gerenciar` | admin, rh, lideranca, colaboradora | COMPAT_REDIRECT | Admin/RH to `/gamificacao-config`; lideranca to `/campanhas`; colaboradora to `/conquistas` | `Gestao de ligas em revisao`, leaderboard, ranking, points, rewards, XP | Liga/ranking/rewards HOLD_PRIVACY_PRODUCT | `tests/unit/module-shells.test.ts`; `platform-product-boundary`; `visual-ux` |
| `/historico` | all authenticated | COMPAT_REDIRECT | Admin/RH/Lideranca to dashboard exams; colaboradora to `/colaboradora` | `Historico indisponivel`, static history product shell, `FeedbackState` | dedicated history product missing | `tests/unit/module-shells.test.ts`; platform boundary screenshots |
| `/produtos-modulos` | admin, rh | PASS_REAL_PRODUCT | `/api/company/modules` plus module state UI | `HOLD`, `company_modules`, `backend`, `runtime`, `scoring`, `intake`, `Modulo sensivel em HOLD` | safe existing module status; sensitive activation denied | `tests/unit/module-shells.test.ts`; `platform-product-boundary`; production smoke |
| `/nr1` | all authenticated | COMPAT_REDIRECT | `ModuleHoldRedirect`: admin to company admin, RH to produtos-modulos, colaboradora to home | COPSOQ form, Yavix calls, laudo, GRO/PGR, static shell text | real NR-1/Yavix/COPSOQ HOLD | `tests/unit/module-shells.test.ts`; `visual-ux`; `platform-product-boundary` |
| `/avaliacao-nr1` | entitled mock-only; production all roles redirect | HOLD_HIDDEN | Mock/dev `CopsoqFlow` only after runtime entitlement and `YAVIX_MOCK`; otherwise `/nr1` | production COPSOQ, Yavix live, laudo, scoring, unavailable preview copy | sensitive hold; mock-only development gate | `tests/unit/module-shells.test.ts`; `tests/unit/nr1-runtime-entitlement.test.ts`; `visual-ux` |
| `/concierge` | all authenticated | COMPAT_REDIRECT | `ModuleHoldRedirect`: admin to company admin, RH to produtos-modulos, colaboradora to home | case form, triage, assignment, SLA, `/api/concierge`, static shell text | operational contract/SLA missing | `tests/unit/module-shells.test.ts`; `visual-ux`; `platform-product-boundary` |
| `/canal-denuncias` | all authenticated | COMPAT_REDIRECT | `ModuleHoldRedirect` | report intake, textarea/form, protocol, `/api/denuncias`, static shell text | partner/legal/DPO workflow missing | `tests/unit/module-shells.test.ts`; `visual-ux`; `platform-product-boundary` |
| `/viva-sipat` | all authenticated | COMPAT_REDIRECT | `ModuleHoldRedirect` | published source package claims, certificates, official schedule, static shell text | approved content source gated | `tests/unit/module-shells.test.ts`; `visual-ux`; `platform-product-boundary` |
| `/desenvolvimento-humano` | all authenticated | COMPAT_REDIRECT | `ModuleHoldRedirect` | trail/product claims, ranking, diagnostic, static shell text | content/trail contract missing | `tests/unit/module-shells.test.ts`; `visual-ux`; `platform-product-boundary` |
| `/colaboradoras-gestao` | rh | PASS_REAL_PRODUCT | Employee/user management and import preview/commit flow | `spec`, `placeholder screen`, unmasked sensitive bulk data in UI | safe existing RH employee management | `visual-ux`: rh-colaboradoras; employee import tests |
| `/company-profile` | rh | PASS_REAL_PRODUCT | Company profile settings | `spec`, `placeholder screen`, unsafe master company mutation claim | safe existing company config | `visual-ux`: rh-company-profile |
| `/departamentos` | rh | PASS_REAL_PRODUCT | Department management | `spec`, `placeholder screen` | safe existing department structure | `visual-ux`: rh-departamentos |
| `/convites` | rh | PASS_REAL_PRODUCT | Invitation management | `spec`, `placeholder screen`, unsafe open invite bypass | safe existing invite flow | `visual-ux`: rh-convites; invite tests |
| `/notificacoes` | rh, colaboradora | PASS_REAL_PRODUCT | Notifications/alerts surface | `spec`, `placeholder screen`, raw sensitive health detail | safe existing notifications | `visual-ux`: rh-notificacoes, colab-notificacoes |
| `/configuracoes` | all authenticated | PASS_REAL_PRODUCT | Profile/configuration page | `spec`, `placeholder screen`, role escalation claims | safe existing profile settings | `visual-ux`: colab-configuracoes; auth/profile tests |
| `/onboarding-rh` | rh, admin | PASS_REAL_PRODUCT | RH onboarding checklist using `/api/rh/onboarding-status` | `spec`, `placeholder screen`, fake completion claims | safe existing onboarding helper | source reviewed; needs next visual inclusion |
| `/primeiro-acesso` | all authenticated first access | PASS_REAL_PRODUCT | First-access password/tour/welcome flow | `spec`, `placeholder screen`, unsafe redirect claims | approved auth onboarding | `auth-redirect` E2E |

## Immediate Findings

1. `COPY_FIX` next candidate: `/gamificacao-config` has rendered/product copy around `governanca privada`. The route is a real RH/admin product surface, so the safe next wave is copy hardening, not redirect/hide.
2. Coverage gap: `/onboarding-rh` is a real helper surface but is not currently in `VISUAL_SMOKE_ROUTES`; before any visual PASS for that route, add or run a focused desktop/mobile authenticated capture.
3. Coverage gap: `/primeiro-acesso` is covered by auth flow E2E but not by the broad visual smoke list. That is acceptable for auth flow correctness, but visual PASS for first-access changes needs dedicated desktop/mobile screenshots.
4. False-positive rule: `placeholder` attributes on inputs are allowed when they are examples/help text. A finding requires a rendered screen that acts as a substitute for product, not normal form placeholder attributes.

## Commands To Keep As Matrix Gate

```powershell
rg --files "src/app/(platform)" -g "page.tsx"
rg -n "ContainedSurfacePreview|spec|placeholder|review|revisao|revisão|em revisão|HOLD|Aguardando|Contrato seguro|governanca|Governanca|preview" "src/app/(platform)" src/components/platform -g "*.tsx" -g "*.ts"
npx vitest run tests/unit/module-shells.test.ts tests/unit/platform/navigation.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
cd tests; npx playwright test --config=playwright.config.ts --project=platform-product-boundary --grep "compatibility|useful surface|module shells|NR-1"
cd tests; npx playwright test --config=playwright.config.ts --project=visual-ux --grep "sidebar top bottom and bottom nav geometry are guarded"
```

## Next Wave

Smallest next implementation wave: `/gamificacao-config` copy hardening.

Gate:

- add/update canary forbidding rendered internal governance/spec vocabulary on approved RH/admin education/private journey surfaces;
- no route or API behavior change;
- landing guard before edit, commit, push and deploy;
- focused unit tests plus `platform-product-boundary` route for `/gamificacao-config`;
- desktop/mobile screenshots for `/gamificacao-config`.
