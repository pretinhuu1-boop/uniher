# Design System: UniHER Authenticated Menu Cards
**Project ID:** UniHER-Paola-P7B-local-references-2026-07-24

## 1. Visual Theme & Atmosphere

The P7B menu target is a premium, editorial, health-brand navigation surface:
deep burgundy, warm cream, gold line work and rose status accents. It should
feel like a polished internal executive app rather than a generic SaaS sidebar.

The surface is dense but calm. Navigation entries carry meaningful descriptions,
small module states and role-specific hierarchy. The design prefers one strong
dark panel over scattered cards. Each row behaves like a structured menu card:
icon, optional number badge, title, description, optional status pill and
optional chevron.

The panel should look substantial and self-contained, with generous rounded
outer corners, a soft cream page background and clear separators between major
groups. It must remain operational: readable, scannable and responsive on
desktop and mobile.

Reference assets:

- `docs/superpowers/assets/2026-07-24-paola-p7b/colaboradora-menu-reference.png`
- `docs/superpowers/assets/2026-07-24-paola-p7b/rh-menu-reference.png`
- `docs/superpowers/assets/2026-07-24-paola-p7b/admin-master-menu-reference.png`

## 2. Color Palette & Roles

- Deep Wine Panel (#320F15): primary sidebar/menu-card background for RH and
  Admin Master dense variants.
- Burgundy Plum Panel (#3D0F19): slightly warmer collaborator menu background.
- Warm Cream Canvas (#FAF2EF): page background around the dark panel and logo
  tile background.
- Pure Text White (#FFFFFF): primary menu titles and brand wordmark on dark
  panels.
- Soft Cream Text (#F6EAE5): secondary descriptions, bullet lists and user
  metadata on dark panels.
- Muted Rose Accent (#D86F86): line icons, section labels, notification badges,
  logout icon and danger-adjacent account actions.
- Burnished Gold Accent (#C99A62): logo mark, product subtitle, selected premium
  icons, key glyphs and contracted-module outline pills.
- Translucent Wine Divider (#5A2430): thin row separators and section rules.
- Deep Footer Wine (#4A1420): account footer strip and lower fixed account
  region.
- Contracted Rose Pill (#B95B6B): filled collaborator module-state pill and
  numbered badges where a warmer status emphasis is needed.

Color governance: visual badges may use the reference treatment, but their text
and state must come from the module contract. Do not hardcode "Módulo
contratado" for modules that are actually locked, coming soon, partner managed
or require a contract.

## 3. Typography Rules

The wordmark uses a high-contrast serif feeling: large, white, confident and
editorial. The product subtitle below it is smaller, warm gold and lightweight.

Menu titles use a clean geometric sans-serif with strong weight. They should be
large enough to scan quickly but not hero-sized. Descriptions and bullet lists
are smaller, soft cream and tightly spaced. Section labels such as `PRINCIPAL`,
`MINHA CONTA`, `CONFIGURAÇÕES` and `ADMINISTRAÇÃO` use uppercase rose/gold text
with moderate tracking.

Numbers in Admin Master and RH menus are compact badge labels, not headings.
They should align with the title baseline and preserve the row's scanning
rhythm.

## 4. Component Stylings

* **Primary menu panel:** Tall, dark burgundy surface with 24-32px outer corner
  radius, soft shadow, 32-48px internal padding and a vertical information
  hierarchy. It can occupy the left side of a wider cream canvas instead of
  stretching full width.
* **Brand header:** Square rounded logo tile, approximately 72-96px depending
  on density, paired with large `UniHER` wordmark and a role subtitle. The logo
  tile is cream with gold line art.
* **Menu rows:** Full-width horizontal rows with icon rail, text block,
  optional number badge, optional state pill and optional chevron. Rows are
  separated by subtle wine dividers rather than boxed in separate cards.
* **Icon rail:** Large line icons in rose or gold. Collaborator and RH icons
  can be unframed. Admin Master icons use square outlined icon frames to create
  a stronger command-center rhythm.
* **Number badges:** Small rounded squares in muted rose, white numbers, fixed
  width and height. They sit between icon and title for Admin Master and inline
  with titles for RH when numbering is shown.
* **Status pills:** Pill-shaped badges with uppercase text. RH/Admin contracted
  states use gold outline and key glyph; collaborator module states may use a
  filled rose pill. Status text must be state-driven.
* **Notification badge:** Circular rose badge with white number, right-aligned
  in the account section.
* **Account footer:** Distinct lower strip with avatar circle, user name, email,
  dropdown chevron and logout row. It is visually attached to the same panel,
  not a separate floating card.
* **Buttons and hit targets:** Visual rows should provide at least 44px
  interactive height. Chevron-only affordances must have accessible labels.

## 5. Layout Principles

Use a single-column vertical navigation system with role-specific density:

- Collaborator: larger spacing, fewer items, softer list descriptions and
  account actions under `MINHA CONTA`.
- RH: compact operational list with numbered headings, bullets for dashboard
  coverage and module status pills aligned to the right rail.
- Admin Master: strongest card-row treatment with framed icons, numbered badges,
  chevrons and a fixed account footer.

The menu should preserve the existing route taxonomy from P1-P4. It may change
visual treatment, grouping density and row composition, but it must not change
which routes are enabled, locked or source-gated.

Spacing guidance:

- Outer panel padding: generous on desktop, compressed but still breathable on
  mobile.
- Row spacing: enough vertical rhythm for descriptions without creating a
  marketing-page feel.
- Section rules: thin separators above section labels and before footer/account
  regions.
- Right rail: reserve stable width for status pills, notification counts and
  chevrons so text never collides with controls.

Responsive behavior:

- Desktop may show the panel as a prominent left navigation rail on cream
  canvas.
- Tablet/mobile should keep the same visual language without horizontal
  overflow; long descriptions wrap within the row text block.
- Do not scale fonts with viewport width. Use fixed role-based text sizes and
  responsive spacing.
- Mobile bottom navigation must not occlude the final account/logout actions.

## 6. Role-Specific Targets

### Collaborator

Use the larger wellness menu variant:

- Brand subtitle: `Saúde Feminina`.
- Main items: Saúde Primária, Meu Bem-Estar, Minha Agenda de Exames, Educação,
  Conquistas, Campanhas, SIPAT, NR-1.
- `Meu Bem-Estar` shows the check-in/check-out prompts as nested bullets.
- `Conquistas` can show Desafios, Recompensas and Ranking as nested bullets, but
  runtime Liga/ranking policy remains gated.
- `MINHA CONTA` contains Notificações, Configurações and Sair da Conta.

### RH

Use the compact operational menu variant:

- Brand subtitle: `RH | Gestão da Saúde e Bem-estar`.
- Principal entries are numbered 1-8.
- Dashboard and module rows may include bullets summarizing the business scope.
- Contracted/locked module pills align on the right rail.
- Configurações section contains company settings, users/permissions and
  notifications.
- User identity footer remains inside the panel.

### Admin Master

Use the strongest command menu variant:

- Brand subtitle: `Administrador da Plataforma`.
- Principal entries are numbered 1-10.
- Each primary row has a framed icon, number badge, title, description and
  chevron.
- Administração section contains Administradores UniHER, Permissões de Acesso
  and Configurações Gerais.
- The account footer uses a darker strip and includes Sair da Plataforma.

## 7. Implementation Guardrails

- This design spec unblocks P7B visual implementation; it does not approve
  production behavior for gated modules.
- Do not expose individual Semaforo, NR-1 answers, mood, agenda/exam details or
  health-sensitive records.
- Do not infer Yavix provisioning, scoring or payloads.
- Do not activate Liga/ranking without the existing product/privacy gate.
- Do not change P5/P6 dashboard projections in the visual lane.
- Do not invent SIPAT, Concierge, Desenvolvimento Humano or Canal de Denuncias
  workflows.
