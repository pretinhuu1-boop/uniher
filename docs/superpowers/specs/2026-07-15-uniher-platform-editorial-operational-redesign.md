# UniHER Platform — Editorial Operational Redesign

**Status:** visual foundation implemented locally at `606ede3`; not deployed; product navigation superseded by the approved alignment

**Date:** 2026-07-15

**Implementation target:** `C:\Users\user\Documents\uniher-app-audit`

**Brand-system source:** `C:\Users\user\Documents\uniher-landing-release\DESIGN.md`

**Product-architecture source:** `docs/superpowers/specs/2026-07-15-uniher-product-ia-roles-entitlements-privacy-design.md`

## 1. Objective

Update the complete authenticated UniHER platform with the same visual system used by the new landing page while improving navigation, hierarchy, consistency, responsiveness, and task efficiency.

The approved direction is **Editorial Operational**: the UniHER identity is prominent in the shell, page framing, and meaningful care moments; working surfaces remain clear, compact, predictable, and accessible. This specification governs visual language and shared product structure. Navigation, entitlements, role capabilities and sensitive-data scope are governed by the product-architecture source above.

## 2. Current-state diagnosis

The current platform already contains elements of the new identity, but they are not yet governed as a cohesive product system:

- cream, gold, navy, nude, Playfair Display, and Montserrat coexist with older aliases and page-specific values;
- profile experiences reuse a similar sidebar but do not consistently prioritize each profile's real task;
- repeated rounded cards, weak grouping, and large empty areas dilute hierarchy;
- typography is editorial in places where operational controls need a neutral sans;
- components, empty states, icons, button treatments, and form controls vary between screens;
- desktop compositions are often reduced rather than recomposed for mobile;
- privacy boundaries exist in behavior but are not always made explicit in interface language.

The redesign will consolidate what works instead of replacing the platform with an unrelated visual concept.

## 3. Design principles

1. **Brand as structure, not decoration.** Espresso shell, bronze actions, porcelain content, and editorial headings create recognition without turning product screens into landing pages.
2. **Task before metric.** Home surfaces lead with what deserves attention and what the user can do next; metrics support decisions rather than fill a dashboard.
3. **One system, role-aware experiences.** RH, Collaborator and Admin Master share foundations but receive different home composition, density and contextual navigation. Leadership uses a constrained team/self context; future specialist operations require scoped product contracts.
4. **Progressive disclosure.** Advanced controls, secondary filters, and destructive actions remain available without dominating primary work.
5. **Privacy made visible.** Copy, permissions, empty states, and information grouping explain what each profile can and cannot see.
6. **Mobile by recomposition.** Mobile prioritizes the next action, not a compressed desktop dashboard.
7. **Familiar interaction.** Standard controls, short transitions, predictable focus, and established product affordances take precedence over novelty.

## 4. Visual foundation

### 4.1 Color roles

Use the approved landing palette with product-specific semantic roles:

| Role | Token direction | Default use |
|---|---|---|
| Shell | Espresso `#201812` | Sidebar, mobile header, restricted/critical context |
| Main canvas | Porcelain `#FFF9F1` | Primary work surface |
| Secondary grouping | Nude `#EFE2D3` | Quiet grouping, selected rows, contextual panels |
| Primary action | Bronze `#B98643` | Main action, active indicator, focus accent |
| Positive | Sage `#536444` | Success, healthy progress, approved state |
| Critical | Marsala `#913337` | Destructive action, serious error, critical alert |
| Primary text | Ink `#211813` | Titles, body, data |
| Secondary text | Muted `#695B50` | Supporting copy with verified AA contrast |
| Borders | Line `#E3D1BC` | Dividers and restrained surface boundaries |

No purple or blue SaaS gradients, glassmorphism, glow decoration, cold gray shadow systems, gradient text, or decorative background grids.

### 4.2 Typography

- Playfair Display is reserved for page titles, meaningful journey landmarks, and high-level numbers that benefit from editorial reading.
- Montserrat, or the existing approved sans equivalent, is used for navigation, labels, controls, body copy, tables, filters, and data.
- UI headings use fixed product scales rather than viewport-driven display typography.
- Labels use sentence case by default. Uppercase is limited to short contextual labels and never becomes an eyebrow above every section.
- Body copy remains within 65–75 characters where it behaves as prose.

### 4.3 Shape, border, and elevation

- Surface radius: 8–14px.
- Pills: buttons, filters, chips, and statuses only.
- A component uses either a restrained border or a short shadow; decorative border-plus-wide-shadow combinations are prohibited.
- Nested cards are prohibited. Use spacing, dividers, headings, and disclosure to express hierarchy.
- Tables and lists should replace identical card grids when items share comparable fields or actions.

### 4.4 Motion

- Product transitions: 150–250ms, ease-out.
- Motion communicates state, continuity, feedback, or disclosure; there are no orchestrated page-load sequences.
- Content is visible without animation dependencies.
- Every animation has a `prefers-reduced-motion` alternative.

## 5. Shared application shell

### 5.1 Desktop

- Fixed espresso sidebar provides logo, contextual navigation groups, active location, user identity, and account actions.
- Main content uses a porcelain canvas with a restrained maximum reading/work width.
- Page header contains context/breadcrumb, page title, concise purpose statement, and no more than one primary action plus necessary secondary actions.
- Summary data uses a ruled horizontal band or compact list before introducing cards.
- Search and profile-specific utilities appear only when they serve the current context.

### 5.2 Tablet and mobile

- Sidebar becomes an accessible contextual drawer.
- Mobile header retains brand, current context, and menu access without reproducing the full desktop navigation.
- Tables become prioritized lists or controlled horizontal regions only when comparison requires columns.
- Charts become a short textual synthesis plus an optional detail view.
- Primary actions remain reachable and maintain a minimum 44px target.
- No horizontal viewport overflow is permitted.

### 5.3 Navigation model

The shell exposes a small shared vocabulary while profile configuration controls labels and destinations. Navigation groups are based on user intent, not the underlying database or module structure. Secondary and administrative tools move into contextual navigation or disclosure instead of expanding the top-level menu indefinitely.

The typed navigation infrastructure implemented in Wave 1 remains valid. Its initial route taxonomy does not: the product architecture approved after the meeting with Dra. Paola replaces the profile maps and prohibits links to absent modules.

## 6. Profile adaptations

### 6.1 RH / Company

**Primary sequence:** attention → action → impact.

- Home explains what needs attention today.
- Campaigns, invitations, departments, and collaborator management support planning and execution.
- Reports communicate aggregated trends and next steps without exposing individual health information.
- Empty states teach how to start a campaign, invite collaborators, or structure departments.

### 6.2 Collaborator

**Primary sequence:** daily focus → care → evolution.

- Home prioritizes one meaningful next step rather than a dense metric dashboard.
- The visible product vocabulary is `Saúde Primária`, `Educação` and `Conquistas`, using real destinations only.
- `Saúde Primária` contains personal care; `Educação` contains campaigns/content; `Conquistas` contains voluntary, non-sensitive progress.
- Progress emphasizes continuity and meaning; gamification supports care without pressure, shame, or manipulative urgency.
- Personal health and emergency information is explicitly private in layout and copy.

### 6.3 Admin Master

**Primary sequence:** exception → administration → audit.

- Home leads with operational exceptions, security alerts, and platform integrity.
- Company, user, role, and system management use dense but consistent lists and tables.
- Destructive or permission-changing actions include clear impact copy, confirmation, and audit visibility.
- Administrative density does not alter the shared visual vocabulary.

## 7. Component architecture

Implement the system in four layers:

1. **Foundation:** semantic tokens for color, type, spacing, radius, elevation, motion, and z-index.
2. **Primitives:** button, icon button, link, input, select, checkbox, textarea, badge/status, avatar, divider, skeleton, feedback message, disclosure, popover, and dialog only when inline alternatives do not fit.
3. **Patterns:** application shell, page header, action bar, filter bar, data list/table, form section, summary band, empty state, permission state, error recovery, and destructive confirmation.
4. **Experiences:** profile dashboards and route-specific compositions built only from approved foundations, primitives, and patterns.

Every interactive component must define default, hover, focus, active, disabled, loading, error, and success behavior where applicable. Shared components must not encode profile-specific business logic.

## 8. Data and state behavior

The visual migration does not independently authorize API or business-rule changes. When existing behavior violates the product privacy contract, a separate containment plan and negative tests must correct the behavior before that route is promoted visually.

The required state sequence for data-driven surfaces is:

1. preserve layout with a skeleton while loading;
2. show data with its last-known or current context clearly labeled;
3. show an instructive first-use state when the collection is valid but empty;
4. show a recoverable Portuguese error with a safe retry action when loading fails;
5. show a permission explanation without leaking protected data when access is denied;
6. confirm mutations near the initiating control and prevent duplicate submission.

Existing authorization is not assumed safe. Verified gaps in Agenda, ranking, Semáforo and small-cohort reporting are blocking until Wave 1.1 passes. The interface must reflect the server-enforced boundary and must never infer or display individual health data in an RH aggregation surface.

## 9. Accessibility and content requirements

- Text contrast meets WCAG AA: 4.5:1 for regular text and 3:1 for large text.
- Focus is visible for every interactive control.
- Keyboard order follows visual order; drawers, menus, and dialogs restore focus correctly.
- Icon-only actions require accessible names; color is never the only state signal.
- Form errors identify the field, explain the problem in Portuguese, and suggest a resolution.
- Touch targets are at least 44px.
- Reduced-motion preferences are respected.
- Empty states use meaningful brand-compatible illustration or simple line mark, not emoji or generated sketch SVG.
- User-facing copy must use correct Portuguese accents and consistent terminology.

## 10. Implementation waves and promotion gates

### Wave 1 — Foundation, completed locally

Semantic tokens, shared shell, responsive navigation infrastructure, primitives, patterns, a representative RH page and test harness are implemented locally. The navigation configuration and scorecard are reopened by the later product/privacy review.

### Wave 1.1 — Privacy containment

Contain Agenda exposure, identified manager notifications, cross-tenant ranking, sensitive-action points, Semáforo/gamification coupling and small-cohort reporting.

### Wave 1.2 — Product navigation alignment

Reuse the typed navigation infrastructure with the approved profile maps and real routes only. Re-run desktop/mobile QA and replace the Wave 1 scorecard.

### Wave 2A — RH Core

Dashboard follow-up, invitations, departments, collaborator management and company profile. Reports require the aggregation gate. Campaigns and gamification configuration move to their own lanes.

### Wave 2B and 2C — Education and Conquistas administration

Separate educational content/campaigns from objectives, rewards, challenges, eligible XP, achievements and classification.

### Wave 3 — Collaborator

Create and migrate the real Saúde Primária, Educação and Conquistas experiences. Daily wellbeing and Concierge require independent specifications.

### Wave 4 — Admin Master

Admin overview, companies, users, permissions, system, alerts, audit, and platform analytics.

Each wave requires:

- focused component and route tests;
- existing functional tests passing;
- production build passing without TypeScript errors;
- desktop and mobile browser QA for every affected profile;
- keyboard and basic screen-reader inspection;
- automated or manual contrast verification;
- screenshot regression review at representative routes;
- no horizontal viewport overflow;
- independent review before promotion to the next wave.

Failed validation triggers localized repair of the affected component or route. It does not justify a global rewrite or promotion of a partially validated wave.

## 11. Representative acceptance criteria

The redesign is successful when:

- the current RH, Collaborator and Admin Master experiences are visibly part of one product system, while Leadership remains a constrained role-aware context;
- users can identify the current context and primary next action without scanning a grid of unrelated cards;
- the landing-page brand is recognizable without compromising product clarity;
- mobile layouts are purposefully recomposed and fully usable;
- shared components have complete interaction and state coverage;
- privacy and permission boundaries are understandable from the interface;
- no validated business behavior or API contract regresses;
- the production build, focused tests, responsive QA, accessibility gates, and independent review pass per wave.

## 12. Explicit non-goals

- Changing business rules, authorization models, or API contracts through visual migration alone; approved containment and product plans remain separate authorities.
- Adding new product modules during the visual-system migration.
- Using this visual specification to preserve an existing behavior that fails the approved privacy contract.
- Rewriting the platform from scratch.
- Converting every region into a card or every interaction into a modal.
- Copying landing-page composition, animation, or display typography directly into dense operational screens.
- Introducing fabricated health data, ROI claims, customer proof, or founder health details.

## 13. Approved decisions

- Priority: balance premium identity and operational efficiency.
- Strategy: establish the shared shell before adapting individual profiles.
- Scope: visual system plus navigation, hierarchy, and component reorganization; business behavior remains unchanged.
- Direction: Editorial Operational.
- Shell: espresso navigation, porcelain work surface, restrained editorial hierarchy, action-oriented mobile composition.
- Component language: controlled radii, minimal elevation, fewer cards, complete states, lists/tables where comparison matters.
- Profile model: RH attention/action/impact; Collaborator focus/care/evolution; Admin exception/administration/audit.
- Product IA: collaborator navigation is organized around Saúde Primária, Educação and Conquistas.
- Delivery: preserve Wave 1 foundation, then run Wave 1.1, Wave 1.2, Wave 2A/2B/2C, Wave 3 and Wave 4 with explicit promotion gates.
