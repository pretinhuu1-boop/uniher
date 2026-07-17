# UniHER Product IA, Roles, Entitlements and Privacy Design

**Status:** approved product contract; implementation gated by Wave 1.1 and Wave 1.2

**Date:** 2026-07-15

**Implementation target:** `C:\Users\user\Documents\uniher-app-audit`

**Local evidence, not versioned:** `C:\Users\user\Documents\uniher-meeting-materials\2026-07-15-reuniao-dra-paola-ata-e-impacto.md`

**Visual-system source:** `docs/superpowers/specs/2026-07-15-uniher-platform-editorial-operational-redesign.md`

## 1. Objective

Align the authenticated UniHER platform with the product direction agreed in the meeting with Dra. Paola without discarding the validated Editorial Operational foundation. The design separates four concerns that the current application mixes: navigation, company entitlements, role capabilities, and sensitive-data scope.

The immediate result is not seven new modules. It is a safe sequence that preserves the local Wave 1 implementation, contains existing privacy exposure, reorganizes real routes under the approved product vocabulary, and creates independent specifications for regulated or operational domains.

## 2. Authority and precedence

When sources conflict, use this order:

1. applicable law, clinical safety, privacy and security constraints;
2. the approved product decisions recorded from the meeting;
3. this product architecture specification;
4. the Editorial Operational visual specification;
5. executable implementation plans;
6. current runtime behavior and legacy labels;
7. landing-page promises and mockups.

The landing is a marketing derivative of the product. It cannot authorize a feature, data flow, compliance claim, or access level that the platform has not implemented and validated.

## 3. Verified implementation state

- Production remains on commit `9ca4bd8`.
- Wave 1 was implemented locally on branch `codex/uniher-platform-wave1`; its last code-bearing baseline is `606ede3`, and it has not been deployed or pushed to a remote branch.
- Its semantic theme, shared shell, mobile drawer, typed navigation infrastructure, primitives, RH dashboard reference surface, test harness and screenshot baselines remain valid foundations.
- Its current navigation taxonomy is superseded by this specification.
- Its previous PASS scorecard must be reopened because later review found P0 exposure in Agenda, ranking, Semáforo and small-cohort reporting outside the original gate.
- The existing Wave 2 RH plan is blocked until Wave 1.1 and Wave 1.2 pass.

## 4. Product principles

1. **One platform, distinct scopes.** Collaborator, RH, leadership, Admin Master and future specialist operators do not share the same navigation or data permissions.
2. **Real destinations only.** A menu item never points to an empty, mock or commercially promised page.
3. **Server authority.** Hidden or locked navigation is explanatory UI, not authorization. APIs enforce capability, entitlement and data scope.
4. **Care is not competition.** Health, mood, exams, Semáforo, psychology, Concierge, denunciations and NR-1 never generate ranking pressure.
5. **Private by default.** Individual health and wellbeing data stays with the collaborator and narrowly assigned care professionals.
6. **Aggregate does not mean anonymous.** RH reporting requires minimum cohorts, suppression and resistance to reidentification through filters or time comparisons.
7. **Incremental delivery.** Existing safe routes are regrouped before new hubs or domains are built.

## 5. Experience and navigation model

### 5.1 Collaborator

The collaborator experience uses four visible concepts:

1. `Hoje` — the current home and immediate next action;
2. `Saúde Primária` — personal care and private health tools;
3. `Educação` — campaigns and learning content;
4. `Conquistas` — voluntary, non-sensitive progress and participation.

The first navigation alignment reuses only existing routes:

| Group | Item | Destination | Release rule |
|---|---|---|---|
| Início | Hoje | `/colaboradora` | Existing route; do not rename the current XP check-in to `Como estou hoje` |
| Saúde Primária | Meu Semáforo | `/semaforo` | Collaborator only; non-diagnostic copy and calculation must pass Wave 1.1 |
| Saúde Primária | Minha Agenda | `/agenda` | Collaborator only; RH exposure and notifications must be removed first |
| Educação | Campanhas e conteúdos | `/campanhas` | Existing route until a real Education hub exists |
| Conquistas | Objetivos e recompensas | `/objetivos` | Voluntary, non-sensitive participation only |
| Conquistas | Desafios | `/desafios` | Voluntary, non-sensitive participation only |
| Conquistas | Minhas conquistas | `/conquistas` | Existing route |
| Conquistas | Classificação geral | `/liga` | Hidden through Wave 1.2; Wave 2C may re-enable it only after tenant isolation and an eligible-action points ledger pass their gate |
| Pessoal | Notificações | `/notificacoes` | Existing route |
| Pessoal | Configurações | `/configuracoes` | Existing route |

`Como estou hoje` is a future daily wellbeing flow. It is separate from the current gamified presence/XP check-in and cannot be exposed under the new name until its own clinical, privacy and escalation specification is approved.

`Concierge` is reserved inside Saúde Primária but is not released by Wave 1.2. It may appear as a locked control only after the server returns an entitlement projection and the locked-state behavior in section 7 exists. Until then it remains absent rather than becoming a fake link.

### 5.2 RH / Company

RH follows the sequence attention → action → impact without access to individual care:

- `Início`: `/dashboard`, after small-cohort protection passes;
- `Pessoas e acesso`: collaborator administration, departments and invitations;
- `Programas`: Wave 1.2 only regroups safe existing Education and Conquistas destinations; Wave 2B and Wave 2C perform their complete functional and visual migrations;
- `Relatórios e empresa`: safe aggregate reports, communication and company profile;
- `Conhecer soluções`: contracted/provisioning/available product states, only after entitlements exist.

The Wave 1.2 RH map is exact:

| Group | Item | Destination | Release rule |
|---|---|---|---|
| Visão geral | Início | `/dashboard` | Available only after small-cohort protection passes |
| Pessoas e acesso | Colaboradoras | `/colaboradoras-gestao` | Administrative identity/organization data only |
| Pessoas e acesso | Departamentos | `/departamentos` | Existing route |
| Pessoas e acesso | Convites | `/convites` | Existing route |
| Programas | Campanhas e educação | `/campanhas` | Existing route until Wave 2B migration |
| Programas | Objetivos e recompensas | `/objetivos` | Existing route; no sensitive points |
| Programas | Desafios | `/desafios/gerenciar` | Existing route; voluntary activities only |
| Programas | Conteúdos e regras | `/gamificacao-config` | Temporary legacy destination; unsafe ranking/health controls are unavailable |
| Relatórios e empresa | Histórico agregado | `/historico` | Hidden until aggregation and eligible-ledger gates pass |
| Relatórios e empresa | Comunicação | `/analytics-emails` | Existing route; no sensitive message content |
| Relatórios e empresa | Perfil da empresa | `/company-profile` | Existing route |
| Pessoal | Notificações | `/notificacoes` | Existing route after sensitive historical notifications are redacted |
| Pessoal | Configurações | `/configuracoes` | Existing route |

The RH navigation must not expose `/agenda`, `/semaforo` or league/classification management during Wave 1.2. RH does not receive individual mood, Semáforo state, exam, appointment, note, red alert, psychology contact, Concierge case, denunciation or raw NR-1 answer.

### 5.3 Leadership

Leadership receives company-authorized educational and engagement programs plus aggregate team information that meets the same minimum-cohort rules as RH. When a leader switches to the Collaborator view, the application uses only that person's self scope; view switching never elevates authorization.

The Wave 1.2 leadership map is exact:

| Group | Item | Destination | Release rule |
|---|---|---|---|
| Equipe | Início | `/dashboard` | Available only when team filters meet the minimum cohort |
| Programas | Campanhas e educação | `/campanhas` | Company-authorized programs only |
| Programas | Objetivos e recompensas | `/objetivos` | Voluntary, non-sensitive actions only |
| Programas | Desafios | `/desafios` | Voluntary, non-sensitive actions only |
| Pessoal | Notificações | `/notificacoes` | No sensitive health/agenda content |
| Pessoal | Configurações | `/configuracoes` | Existing route |

`/agenda`, `/semaforo`, `/historico` and `/liga` are removed from the leadership navigation until separate safe aggregate or tenant-scoped experiences exist.

### 5.4 Admin Master and UniHER operations

Admin Master manages companies, users, provisioning, security and audit. Global administration does not grant clinical, Concierge, denunciation or raw NR-1 access.

Future operational work uses scoped assignments rather than the single current `users.role` field:

- UniHER operations — onboarding, contract and provisioning state;
- Concierge operator — assigned companies and assigned cases;
- care professional — assigned alerts/cases under an approved protocol;
- denunciation investigator — isolated cases in that domain;
- NR-1 specialist — active assessment cycles, plans and evidence.

The Wave 1.2 Admin Master map remains intentionally small:

| Group | Item | Destination | Release rule |
|---|---|---|---|
| Operação | Visão geral | `/admin` | Existing global administration tabs remain contextual inside the route |
| Operação | Analytics global | `/analytics-emails` | Operational metadata only; no clinical/denunciation payload |
| Pessoal | Notificações | `/notificacoes` | Security/operations notifications only |
| Pessoal | Configurações | `/configuracoes` | Existing route |

The future specialist roles above do not enter Wave 1.1, Wave 1.2 or Wave 2A.

## 6. Access decision contract

Every protected action on a resource requires all four dimensions:

1. **Capability:** what the authenticated role or scoped assignment may do;
2. **Company entitlement:** whether the tenant contracted the module;
3. **Data scope:** `self`, `department_aggregate`, `company_aggregate`, `assigned_case` or `global_operations`;
4. **Lifecycle:** `not_contracted`, `provisioning`, `active`, `suspended`, `expired` or `unknown`.

`companies.plan` (`trial`, `pro`, `enterprise`) is not sufficient as a module-entitlement model. A later plan will introduce a tenant-scoped entitlement source and a server-filtered navigation projection. Local storage and client-side role maps never decide access.

Only `active` grants module access. `locked` is a UI projection of a non-active lifecycle, not an authorization state. The server derives the authenticated subject, subject tenant, resource tenant and requested action; it never trusts tenant, role or scope supplied by the client. Unknown, missing, suspended or inconsistent access fails closed. Direct URLs and APIs return a safe authorization response without protected payloads or information about another company. `global_operations` grants global non-clinical metadata only.

## 7. Locked-module behavior

After the entitlement foundation exists:

- a locked item is a keyboard-focusable button with a visible label and lock icon, never a broken link;
- it opens an explanatory side sheet on desktop and bottom sheet on mobile;
- a collaborator sees neutral availability copy without pricing or a commercial CTA;
- RH may receive `Conhecer solução` or `Solicitar ativação` actions;
- `provisioning` is labeled `Em implantação` without an invented date;
- `not_contracted`, `suspended`, `expired` and `unknown` expose no protected cache or destination; RH receives a neutral support path and the collaborator receives only an availability message;
- revocation invalidates server-side entitlement/session caches, cancels or reauthorizes queued jobs, clears client module state and exits safely;
- the API remains the authority even when UI state is stale.

The `Ø` annotation for Viva SIPAT, Desenvolvimento Humano, Canal de Denúncia and NR-1 was not defined conclusively. Those modules stay inactive and absent until the product owner confirms their commercial state and each domain has an approved specification.

## 8. P0 containment contract

### 8.1 Agenda

- Remove Agenda from RH and leadership navigation.
- Stop returning individual agenda events, notes, names, emails or identifiers to RH/leadership/Admin Master.
- Stop sending managers notifications containing collaborator identity, exam/appointment type, date or time across API, cron, push, email, export and queued jobs.
- Inventory persisted notifications and redact or delete sensitive historical content under an auditable migration; disable obsolete manager notification preferences.
- Keep the personal Agenda self-scoped.
- Future Concierge access is case-assigned, purpose-limited, audited and revocable.
- If RH utilization reporting is later required, it uses a separate aggregate endpoint with minimum-cohort protection.

### 8.2 Ranking and points

- Disable Liga/Classificação output and management until every query is tenant-scoped and the eligible-action ledger exists. Wave 1.1 returns a neutral unavailable state; Wave 2C may re-enable the feature after its gate.
- Exclude wellbeing check-ins, mood, Semáforo, exams, appointments, care contacts, denunciations and NR-1 from XP, weekly points, badges and ranking.
- Respect the collaborator's ranking privacy preference at the backend.
- Build future rankings from an explicit ledger of eligible, voluntary, non-sensitive actions.
- Quarantine historical points, levels, badges and league results whose provenance is not demonstrably eligible; do not display or migrate them into the new ranking.

### 8.3 Semáforo

- Disable recalculation that mixes streak, missions, level or points with health dimensions.
- Quarantine existing derived scores and render a neutral `Em revisão` state to the collaborator; do not display the last contaminated score as a health result.
- Remove diagnostic or urgent clinical claims not backed by an approved protocol.
- Keep personal state separate from gamification and from occupational-risk classification.
- Do not expose a personal collaborator Semáforo route as an aggregate RH/team surface.

### 8.4 Dashboard and reports

- Require at least 10 distinct active participants in every displayed health, wellbeing or engagement cell after all filters. The product may raise this threshold through an approved privacy assessment but never lower it through tenant configuration.
- Count distinct people after every applied filter. Apply primary suppression to every cell below 10 and complementary suppression to totals/adjacent cells that could reconstruct a hidden value.
- Limit cross-filters and time-difference comparisons that permit singling out.
- Do not aggregate points contaminated by sensitive actions.
- API, UI, CSV/export, scheduled report and cache return a suppression marker and no underlying number. The UI says `Dados insuficientes para proteger a privacidade`.
- Fail closed when cohort size or suppression cannot be calculated. Test 9 and 10 participants, successive filters, temporal differences and reconstruction from totals.
- A hidden name is insufficient when the value can still identify a person.

## 9. Canonical delivery sequence

### Wave 1 — Foundation, completed locally

Preserve the theme, shell, responsive drawer, primitives, navigation infrastructure, RH reference surface and test harness. Treat the navigation configuration and previous scorecard as reopened by the product and privacy review.

### Wave 1.1 — Privacy containment

Contain Agenda exposure and manager notifications, ranking cross-tenant leakage, health-derived points, Semáforo/gamification coupling and small-cohort reporting. Add negative role, tenant and payload tests. No visual-route migration advances until this wave passes.

### Wave 1.2 — Product navigation alignment

Reuse the typed navigation infrastructure while replacing its configuration with the profile maps in section 5. Use existing destinations only. Re-run desktop/mobile shell QA and update screenshot baselines and the Wave 1 scorecard.

### Wave 2A — RH Core

Migrate dashboard follow-up, invitations, departments, collaborator administration and company profile. Reports join only after the aggregation contract passes. Campaigns and gamification configuration are excluded from this lane.

### Wave 2B — Education administration

Separate campaigns, monthly cadence, lessons and educational content from gamification configuration. Preserve existing content and APIs only when they meet the new boundary.

### Wave 2C — Conquistas administration

Separate objectives, rewards, challenges, eligible XP, achievements and tenant-scoped classification. Health or sensitive behavior cannot influence this domain.

### Wave 3 — Collaborator experience

Create real Saúde Primária, Educação and Conquistas hubs, then migrate/recompose their existing routes. The daily wellbeing flow and Concierge enter only through their independent specifications.

### Wave 4 — Admin Master

Migrate global administration and add entitlement provisioning/audit after the entitlement contract is implemented.

## 10. Independent product specifications

The following domains do not share one implementation plan:

- daily check-in/check-out and human escalation;
- Concierge operations and client-provider mode;
- NR-1 technical cycle and evidence;
- isolated denunciation channel;
- Viva SIPAT;
- Desenvolvimento Humano;
- Education hub and monthly campaigns;
- safe Conquistas/gamification.

Viva SIPAT and Desenvolvimento Humano remain in discovery until the product owner confirms whether they are separate offers. NR-1 remains a technical/commercial track where a questionnaire is only one tool, never proof of compliance.

The Concierge specification must keep client-employed and UniHER-employed operators as distinct provider modes; neither mode grants RH access. It must define case-assignment scope and expiry, purpose and data minimization, participant notice and lawful treatment basis, protected messaging, retention and deletion, audited break-glass access, emergency routing and immediate revocation across sessions, caches, queues and scheduled jobs.

The denunciation channel uses an isolated case store, anonymous/confidential participation modes, minimal metadata, an anonymous return channel, restricted investigator assignments, conflict-of-interest routing, safe attachment handling, non-retaliation controls, immutable audit and a retention/legal-hold policy. Company RH/Admin and Admin Master do not inherit case access. Raw NR-1 answers remain outside `health_scores`, quiz/gamification tables, Semáforo, ranking, individual RH decisions, the denunciation domain and general RH exports; its future cycle uses a versioned instrument, safe aggregation and explicit evidence retention.

The proposed five-day wellbeing contact and 24-hour stale-red escalation remain blocked hypotheses. No automation may exist until the daily wellbeing specification defines notice/participation choice, lawful purpose, clinical triage, responsible professionals, emergency handling, contact limits, retention and audit.

## 11. Landing alignment

The landing mockup and copy are updated only after the corresponding product behavior is approved and implemented. Until then:

- do not imply that daily check-out, Concierge, NR-1 operations or denunciation are live;
- do not publish meeting claims about fines, costs, ROI or percentages without source and legal review;
- keep the statement that a questionnaire alone does not demonstrate NR-1 management;
- use `núcleo integrado` or `pacote base`, not the internal phrase `venda casada`.

## 12. Acceptance criteria

This design is satisfied when:

- the validated Wave 1 visual foundation remains intact;
- no RH, leader or Admin Master path returns or renders individual health/agenda data;
- ranking is tenant-scoped and excludes all sensitive actions;
- Semáforo is not derived from engagement or presented as diagnosis;
- small cohorts are suppressed in dashboard/reporting;
- collaborator navigation visibly groups real routes under Saúde Primária, Educação and Conquistas;
- missing modules do not become links or fake pages;
- locked modules depend on a server entitlement projection and server authorization;
- desktop and mobile QA, keyboard/focus, TypeScript, build, unit and browser tests pass on the reviewed commit;
- the scorecard records exact negative privacy probes and a PASS/FAIL promotion decision.

## 13. Explicit non-goals

- Deploying or merging the current Wave 1 branch before Wave 1.1 and Wave 1.2 pass.
- Building all seven handwritten menu ideas in one release.
- Treating client-side visibility as authorization.
- Converting the existing XP check-in into wellbeing collection by renaming it.
- Reusing quiz, Semáforo or gamification as an NR-1 assessment.
- Giving Admin Master implicit access to clinical, Concierge or denunciation data.
- Creating placeholder hubs, mock compliance pages or unverified commercial claims.

## 14. Approved decisions and safe defaults

- Preserve the completed Wave 1 foundation instead of restarting.
- Insert Wave 1.1 and Wave 1.2 before Wave 2.
- Use three collaborator product areas: Saúde Primária, Educação and Conquistas.
- Treat `Ø` as unresolved; unresolved modules remain inactive.
- Support both UniHER Concierge and client-provided Concierge in the future model.
- Keep wellbeing data separate from XP, ranking and occupational reporting.
- Keep NR-1, Concierge, denunciation, Viva SIPAT and Desenvolvimento Humano out of the immediate navigation implementation.
- Require a new review and scorecard before branch promotion, remote publication, merge or deployment.
