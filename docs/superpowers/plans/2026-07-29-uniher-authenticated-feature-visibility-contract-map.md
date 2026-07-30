# UniHER authenticated feature visibility and contract map

Date: 2026-07-29

Goal: remap authenticated product surfaces that exist but do not appear, decide what can be safely exposed now, and define the contract/governance gates for blocked modules. Public landing remains out of scope and must not be edited by this wave.

## Decision

- Safe unlock now: expose `/comunidade/gerenciar` in RH navigation. The page and backend already allow RH/Admin editorial work for simple community text posts.
- Keep hidden or flow-only: `/historico`, `/onboarding-rh`, `/primeiro-acesso`, `/saude-primaria`, `/desafios/gerenciar`, `/liga`, `/liga/gerenciar`.
- Keep shell/gated: `/concierge`, `/produtos-modulos`, `/nr1`, `/viva-sipat`, `/desenvolvimento-humano`, `/canal-denuncias`.
- Keep runtime entitlement-gated only: `/avaliacao-nr1`.

## Visibility Matrix

| Surface | Current visibility | Runtime status | Decision |
| --- | --- | --- | --- |
| `/comunidade/gerenciar` | Admin base nav; RH page access without nav | Real RH/Admin editorial CRUD for simple text community posts | UNLOCK_RH_NAV |
| `/campanhas` | RH, lideranca, colaboradora | Real/limited campaigns | KEEP |
| `/gamificacao-config` | Admin/RH | Real lesson manager and governance, no ranking/reward/Liga | KEEP_SAFE_LIMITED |
| `/objetivos` | Colaboradora | Real private personal objectives only | KEEP_COLLAB_ONLY |
| `/desafios` | Colaboradora | Real voluntary challenges only, no ranking/points | KEEP_COLLAB_ONLY |
| `/conquistas` | Colaboradora | Real private achievements projection | KEEP_COLLAB_ONLY |
| `/agenda` | Colaboradora | Real personal agenda only | KEEP_COLLAB_ONLY |
| `/notificacoes` | RH base; personal utility elsewhere | Real personal notifications | KEEP_PERSONAL |
| `/configuracoes` | Personal/profile surface | Real personal settings | KEEP_PERSONAL |
| `/historico` | Not visible | Partial/protected history | HOLD_PRODUCTIZE_HISTORY |
| `/onboarding-rh` | Not visible | First-run helper | KEEP_FLOW_ONLY |
| `/primeiro-acesso` | Not visible | First-access helper | KEEP_FLOW_ONLY |
| `/saude-primaria` | Hidden compatibility route | Redirect/compatibility | KEEP_HIDDEN |
| `/desafios/gerenciar` | Not visible | Review shell | HOLD_GOVERNED_CHALLENGE_ADMIN |
| `/liga` | Not visible | Review shell | HOLD_PRIVACY_PRODUCT |
| `/liga/gerenciar` | Not visible | Review shell | HOLD_PRIVACY_PRODUCT |

## Contract And Governance Gates

| Feature | Current support | Missing contract/governance | Gate before real product |
| --- | --- | --- | --- |
| Concierge | Module slug and `/concierge` shell only | Case model, service owner, SLA, escalation policy, allowed/prohibited data, emergency handling | Approved Concierge operational contract, tenant case API, audit trail, tests proving no Semaforo/NR-1/health-data pull |
| Canal de Denuncias | Module slug and shell only | Partner/internal decision, DPA/legal owner, anonymity, retention, conflict handling, role access | Prefer partner-managed config first; tests prove UniHER stores only config/link until DPO/legal approves intake |
| Viva SIPAT | Module slug and source-pending shell | Approved content source, licensing, calendar, notification rules, certificate policy | SIPAT content package + owner approval + tests proving no invented lessons/videos/certificates |
| Desenvolvimento Humano | Module slug and shell only | Contracted offer, authorship, review workflow, progression rules, sensitive-data exclusions | DH trail/content schema based on approved content only; tests blocking health/NR-1/Semaforo/agenda use |
| NR-1/Yavix real | Entitlement/consent gates and dev/test mock path; real path fail-closed | Yavix auth/SSO, sandbox, provisioning, result/scoring/laudo contract, CPF/GHE/cycles, DPA, retention, GRO/PGR boundaries | Wave 00 Yavix contract intake before any real proxy/results implementation; tests for fail-closed, token secrecy, no compliance promise |
| Liga/ranking/rewards | Legacy tables exist but APIs are privacy-review gated | Opt-in, no health-derived ranking, suppression, scoring/economy, redemption ops, appeals/removal, DPO/legal approval | New safe motivation contract or keep blocked; no nominal leaderboard/rewards until approved |
| Produtos/Modulos | Backend can list/update module rows; sensitive modules cannot be enabled | UI policy, Master Admin mutation flow, audit review, per-module activation policy | P8 UI may manage non-sensitive states only; sensitive enablement remains external HOLD |
| Educacao/Conteudos | Community posts, campaigns and lessons are real limited primitives | Content ops runbook, source review, media/upload policy, notification policy | Build education/content panel only over approved primitives; tests block XP/ranking/certificate claims |

## Safe Next Units

1. RH navigation unlock for `/comunidade/gerenciar`.
2. P8 non-sensitive module management UI contract, with sensitive modules displayed as HOLD.
3. Educacao/Conteudos panel over lessons/community/campaign primitives, with content-source validation.
4. Denuncias partner-managed configuration spec, before any inbox/intake.
5. Yavix Wave 00 intake checklist before any production NR-1 integration.

## Stop Conditions

- Do not touch current public landing.
- Do not expose collaborator access to management routes.
- Do not promote Liga/ranking/rewards, Concierge operations, Denuncias intake, SIPAT operations, DH trails, or real NR-1/Yavix without their approved contract.
- Do not allow Admin module mutation to enable sensitive module slugs as real workflows.
