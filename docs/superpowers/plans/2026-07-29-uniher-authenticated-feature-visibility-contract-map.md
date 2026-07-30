# UniHER authenticated feature visibility and contract map

Date: 2026-07-29

Goal: remap authenticated product surfaces that exist but do not appear, decide what can be safely exposed now, and define the contract/governance gates for blocked modules. Public landing remains out of scope and must not be edited by this wave.

## Decision

- Safe unlock now: expose `/comunidade/gerenciar` in RH navigation. The page and backend already allow RH/Admin editorial work for simple community text posts.
- Promoted in the no-spec recovery wave: `/produtos-modulos` now reads the real `/api/company/modules` contract and shows non-sensitive governance while keeping sensitive modules in HOLD.
- Promoted as compatibility redirects in the no-spec recovery wave: `/historico` now routes to `/dashboard?section=exames` or `/colaboradora`; `/desafios/gerenciar` now routes to `/gamificacao-config` or `/desafios`; `/liga` and `/liga/gerenciar` now route to safe non-ranking surfaces.
- Hidden from normal navigation in the no-spec recovery wave: Concierge, NR-1, SIPAT, Desenvolvimento Humano and Canal de Denuncias module shell links. Their direct URLs remain fail-closed for containment, while `/produtos-modulos` remains the visible governance surface.
- Keep hidden or flow-only: `/onboarding-rh`, `/primeiro-acesso`, `/saude-primaria`.
- Keep shell/gated: `/concierge`, `/nr1`, `/viva-sipat`, `/desenvolvimento-humano`, `/canal-denuncias`.
- Keep runtime entitlement-gated only: `/avaliacao-nr1`.

## Visibility Matrix

| Surface | Current visibility | Runtime status | Decision |
| --- | --- | --- | --- |
| `/comunidade/gerenciar` | Admin base nav; RH page access without nav | Real RH/Admin editorial CRUD for simple text community posts | UNLOCK_RH_NAV |
| `/campanhas` | RH, lideranca, colaboradora | Real/limited campaigns | KEEP |
| `/gamificacao-config` | Admin/RH | Real lesson manager and governance, no ranking/reward/Liga | KEEP_SAFE_LIMITED |
| `/produtos-modulos` | Authenticated company-scoped users; mutation remains Master Admin-only through API | Real module-state view backed by `/api/company/modules`; non-sensitive state management only; sensitive modules displayed as HOLD | KEEP_SAFE_LIMITED |
| `/objetivos` | Colaboradora | Real private personal objectives only | KEEP_COLLAB_ONLY |
| `/desafios` | Colaboradora | Real voluntary challenges only, no ranking/points | KEEP_COLLAB_ONLY |
| `/conquistas` | Colaboradora | Real private achievements projection | KEEP_COLLAB_ONLY |
| `/agenda` | Colaboradora | Real personal agenda only | KEEP_COLLAB_ONLY |
| `/notificacoes` | RH base; personal utility elsewhere | Real personal notifications | KEEP_PERSONAL |
| `/configuracoes` | Personal/profile surface | Real personal settings | KEEP_PERSONAL |
| `/historico` | Compatibility route | Redirects to consolidated dashboard/collaborator surfaces; no standalone history UI | KEEP_COMPAT_REDIRECT_HOLD_HISTORY |
| `/onboarding-rh` | Not visible | First-run helper | KEEP_FLOW_ONLY |
| `/primeiro-acesso` | Not visible | First-access helper | KEEP_FLOW_ONLY |
| `/saude-primaria` | Hidden compatibility route | Redirect/compatibility | KEEP_HIDDEN |
| `/desafios/gerenciar` | Compatibility route | Redirects to `/gamificacao-config` for RH/Admin and `/desafios` for colaboradora; no challenge-admin workflow | KEEP_COMPAT_REDIRECT_HOLD_CHALLENGE_ADMIN |
| `/liga` | Compatibility route | Redirects to `/conquistas` for colaboradora and `/gamificacao-config` for RH/Admin; no Liga/ranking/rewards product | KEEP_COMPAT_REDIRECT_HOLD_PRIVACY_PRODUCT |
| `/liga/gerenciar` | Compatibility route | Redirects to `/gamificacao-config` for RH/Admin and `/conquistas` for colaboradora; no Liga management workflow | KEEP_COMPAT_REDIRECT_HOLD_PRIVACY_PRODUCT |
| `/concierge`, `/nr1`, `/viva-sipat`, `/desenvolvimento-humano`, `/canal-denuncias` | Hidden from final navigation; direct URL only | Fail-closed shell/gate for audit/deep-link containment | HOLD_DIRECT_URL_HIDE_NAV |

## Contract And Governance Gates

| Feature | Current support | Missing contract/governance | Gate before real product |
| --- | --- | --- | --- |
| Concierge | Module slug and `/concierge` shell only | Case model, service owner, SLA, escalation policy, allowed/prohibited data, emergency handling | Approved Concierge operational contract, tenant case API, audit trail, tests proving no Semaforo/NR-1/health-data pull |
| Canal de Denuncias | Module slug and shell only | Partner/internal decision, DPA/legal owner, anonymity, retention, conflict handling, role access | Prefer partner-managed config first; tests prove UniHER stores only config/link until DPO/legal approves intake |
| Viva SIPAT | Module slug and source-pending shell | Approved content source, licensing, calendar, notification rules, certificate policy | SIPAT content package + owner approval + tests proving no invented lessons/videos/certificates |
| Desenvolvimento Humano | Module slug and shell only | Contracted offer, authorship, review workflow, progression rules, sensitive-data exclusions | DH trail/content schema based on approved content only; tests blocking health/NR-1/Semaforo/agenda use |
| NR-1/Yavix real | Entitlement/consent gates and dev/test mock path; real path fail-closed | Yavix auth/SSO, sandbox, provisioning, result/scoring/laudo contract, CPF/GHE/cycles, DPA, retention, GRO/PGR boundaries | Wave 00 Yavix contract intake before any real proxy/results implementation; tests for fail-closed, token secrecy, no compliance promise |
| Liga/ranking/rewards | Legacy tables exist but APIs are privacy-review gated | Opt-in, no health-derived ranking, suppression, scoring/economy, redemption ops, appeals/removal, DPO/legal approval | New safe motivation contract or keep blocked; no nominal leaderboard/rewards until approved |
| Produtos/Modulos | UI and backend can list module rows; Master Admin API can update non-sensitive states; sensitive modules are rendered as HOLD and cannot be enabled by this surface | Company selector/audit review UX for broader Master Admin operations; any sensitive activation remains external | Keep UI limited to non-sensitive states; sensitive enablement remains external HOLD |
| Educacao/Conteudos | Community posts, campaigns and lessons are real limited primitives | Content ops runbook, source review, media/upload policy, notification policy | Build education/content panel only over approved primitives; tests block XP/ranking/certificate claims |

## Safe Next Units

1. RH navigation unlock for `/comunidade/gerenciar`.
2. Productize a dedicated history surface only after a concrete product contract and projection boundary.
3. Educacao/Conteudos panel over lessons/community/campaign primitives, with content-source validation.
4. Denuncias partner-managed configuration spec, before any inbox/intake.
5. Yavix Wave 00 intake checklist before any production NR-1 integration.

## Stop Conditions

- Do not touch current public landing.
- Do not expose collaborator access to management routes.
- Do not promote Liga/ranking/rewards, Concierge operations, Denuncias intake, SIPAT operations, DH trails, or real NR-1/Yavix without their approved contract.
- Do not allow Admin module mutation to enable sensitive module slugs as real workflows.
