# UniHER Sidebar Route Map

Date: 2026-07-27
Status: current operational mapping, not production approval
Scope: authenticated platform sidebar routes by role/panel after the Paola P7B visual redesign

## Current Decision

The sidebar must keep the role-specific order and grouping, but numeric badges
beside the menu labels are no longer part of the current product direction.

Allowed visual metadata:

- module state badges such as `Bloqueado`, `Em breve`, `Parceiro` and `Contrato`
- notification count badges
- Admin primary chevrons
- bullets/descriptions that explain scope without promising gated functionality

Not allowed as current sidebar treatment:

- sequence badges like `1`, `2`, `3`, `4` beside primary menu labels
- copy that makes gated modules look operational
- links that expose individual health, mood, NR-1 answer, ranking or score data

Primary implementation files:

- `src/components/platform/navigation.ts`
- `src/components/platform/Sidebar.tsx`
- `src/components/platform/SidebarNavItem.tsx`

## Collaborator Panel

Brand subtitle: `Saude Feminina`

| Planned surface | Current sidebar route | Runtime status | Mapping decision |
| --- | --- | --- | --- |
| Saude Primaria / Semaforo | `/semaforo` | Partial/gated shell | Keep visible as the primary health entry. Do not expose individual health scoring beyond the approved runtime. |
| Meu Bem-Estar | `/colaboradora` | Implemented | Keep as the daily check-in/check-out home. |
| Minha Agenda de Exames | `/agenda` | Implemented | Keep as personal agenda/exam surface. |
| Educacao | `/comunidade` | Implemented | Keep as collaborator education/community feed. |
| Conquistas | `/conquistas` | Implemented partial | Keep, but later organize as a hub or expose safe sublinks for real existing surfaces. |
| Desafios | `/desafios` | Implemented for collaborator | Missing from primary sidebar as a direct route; candidate child under Conquistas. |
| Objetivos | `/objetivos` | Implemented for collaborator | Missing from primary sidebar as a direct route; candidate child under Conquistas. |
| Ranking / Liga | `/liga` | Gated by privacy/product containment | Do not activate ranking. If shown, it must remain clearly gated. |
| Campanhas | `/campanhas` | Implemented | Keep visible. |
| SIPAT | `/viva-sipat` | Shell/gated | May appear through module-aware navigation; keep state-driven badge. |
| NR-1 | `/avaliacao-nr1` when enabled, otherwise `/nr1` | Partial/gated | Keep state-driven. Do not infer Yavix provisioning or scoring. |
| Notificacoes | `/notificacoes` | Implemented | Keep in Minha Conta with unread badge. |
| Configuracoes | `/configuracoes` | Implemented | Keep in Minha Conta. |

Current collaborator finding:

- P1: `Desafios` and `Objetivos` are real collaborator surfaces, but the
  sidebar currently hides them behind the broader `Conquistas` concept.

## RH / Admin Empresa Panel

Brand subtitle: `RH | Gestao da Saude e Bem-estar`

| Planned surface | Current sidebar route | Runtime status | Mapping decision |
| --- | --- | --- | --- |
| Dashboard | `/dashboard` | Implemented | Keep as RH aggregate dashboard. |
| Saude Primaria | `/dashboard?section=saude-primaria` | Partial aggregate | Keep as aggregate/protected destination. |
| Concierge | represented under Saude Primaria or `/concierge` through module state | Shell/gated | Do not expose as operational unless contract/runtime exists. |
| Educacao | `/campanhas` | Partial | Keep for campaigns, but map whether RH also needs editorial management. |
| Conteudos / trilhas / videoaulas | currently not a stable RH menu destination | Partial/gated API surface | Needs later product decision before exposing as RH management route. |
| Conquistas | `/gamificacao-config` | Gated/review | Keep gated. RH challenge/objective/league management APIs intentionally return privacy review responses. |
| NR-1 | `/nr1` | Shell/gated for RH | Keep module-state badge. |
| Viva SIPAT | `/viva-sipat` | Shell/gated | Keep module-state badge. |
| Desenvolvimento Humano | `/desenvolvimento-humano` | Shell/gated | Keep module-state badge. |
| Canal de Denuncias | `/canal-denuncias` | Shell/gated | Keep module-state badge. |
| Configuracoes da Empresa | `/company-profile` | Implemented | Keep in Configuracoes. |
| Usuarias e Permissoes | `/colaboradoras-gestao` | Implemented | Keep in Configuracoes. |
| Departamentos | `/departamentos` | Implemented | Keep as operational subitem, even though the compact visual reference only showed broader settings. |
| Convites | `/convites` | Implemented | Keep as operational subitem, or later nest under users/permissions. |
| Notificacoes | `/notificacoes` | Implemented | Keep with unread badge. |

Current RH findings:

- P1: The target RH menu expects a stable visible module set. The current base
  navigation has only Dashboard, Saude Primaria, Educacao and Conquistas, then
  depends on `/api/company/modules` to append NR-1/SIPAT/DH/Denuncias.
- P1: RH Educacao currently opens campaigns. The broader content/editorial
  management path exists for Admin at `/comunidade/gerenciar`, but RH exposure
  needs explicit route/governance mapping.
- P2: Concierge must stay represented as gated unless a real case-management
  workflow and contract gate are approved.

## Admin Master Panel

Brand subtitle: `Administrador da Plataforma`

| Planned surface | Current sidebar route | Runtime status | Mapping decision |
| --- | --- | --- | --- |
| Dashboard Geral | `/admin` | Implemented | Keep as platform overview. |
| Empresas | `/admin?tab=empresas` | Implemented | Keep. |
| Saude Primaria | `/dashboard?section=saude-primaria` | Partial aggregate | Keep only as protected aggregate view. |
| Concierge | `/concierge` | Shell/gated | Keep gated. |
| Dashboard de Exames | `/dashboard?section=exames` | Partial aggregate | Verify whether `section=exames` is semantic or only active-link state. |
| Educacao | `/comunidade/gerenciar` | Implemented | Keep as editorial/education management. |
| Gamificacao | `/gamificacao-config` | Gated/review | Keep gated. |
| Produtos e Modulos | `/admin?tab=empresas&section=modulos` | Partial | Needs real module-management section or clearer destination. |
| Relatorios | `/analytics-emails` | Partial/protected | Keep as current reports surface. |
| Configuracoes | `/admin?tab=sistema` | Implemented | Keep. |
| Administradores UniHER | `/admin?tab=admin` | Implemented | Keep in Administracao. |
| Permissoes de Acesso | `/admin?tab=usuarios` | Implemented | Keep in Administracao. |
| Configuracoes Gerais | `/admin?tab=sistema&section=gerais` | Implemented | Keep; SystemTab consumes `section=gerais`. |

Current Admin findings:

- P1: `Produtos e Modulos` points to `tab=empresas&section=modulos`, but the
  Admin page currently resolves the tab and only `SystemTab` consumes specific
  sections. Treat module management as partial until a real section exists.
- P2: `/dashboard?section=exames` and `/dashboard?section=saude-primaria` are
  safe destinations, but the dashboard page should be checked before claiming
  those sections as dedicated screens.
- P2: `Gamificacao`, `Concierge`, SIPAT, Desenvolvimento Humano and Canal de
  Denuncias must remain gated/shell surfaces until approved.

## Leadership Panel

Brand subtitle currently follows the manager/RH variant.

| Current surface | Current sidebar route | Runtime status | Mapping decision |
| --- | --- | --- | --- |
| Dashboard da equipe | `/dashboard` | Implemented aggregate | Keep minimal until a dedicated leadership visual contract exists. |
| Campanhas e trilhas | `/campanhas` | Implemented/limited | Keep. |

Current leadership finding:

- P2: Leadership exists in code but was not part of the three primary reference
  sidebars. Do not broaden it without an explicit panel contract.

## Next Organization Wave

1. Keep sidebar numbering disabled in production rendering.
2. Decide whether collaborator `Conquistas` becomes a hub for `/conquistas`,
   `/objetivos` and `/desafios`, or whether those routes become direct child
   entries.
3. Decide whether RH module rows should be always visible as gated module
   entries, independent of company module rows, to match the reference panel.
4. Give Admin `Produtos e Modulos` a real destination or downgrade the menu
   copy so it does not promise controls that are not implemented.
5. Verify dashboard query sections (`saude-primaria`, `exames`) as actual
   screen states, anchors or tabs before calling them fully mapped.
