# UniHER Company Community Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Release receipt (2026-07-21):** the company-scoped Community feed, collaborator actions, private saved items, supporter consent, RH/admin editorial management, company switch, navigation, and privacy boundaries are functional. Evidence is gate-specific: visual regression on `f87c5fd`, the integrated E2E matrix twice on `908357f`, and the complete unit/build gate on `006770f`. The later documentation-only commit records these receipts and is not itself claimed as a tested runtime HEAD.

**Goal:** Build a functional, company-scoped community feed for authenticated collaborators, with curated company content, private saves, anonymous aggregate support, and explicit opt-in for displaying a supporter name.

**Architecture:** Reuse the existing `company_id` from the authenticated JWT and the existing `feed_company_enabled` company setting. Add a small community domain with company-owned posts, separate support/save relations, and a preference key in the existing `user_preferences` table. Keep the first release curated and read-only for collaborators: RH/admin create and publish company content; collaborators cannot create posts, comments, rankings, or health-related responses.

**Tech Stack:** Next.js App Router, TypeScript, SQLite migrations, `getReadDb`/`getWriteQueue`, Zod, `withAuth`/`withRole`, SWR, existing platform components, Playwright, Vitest.

---

## Product Contract

- Audience: authenticated users with collaborator self capability (`role='colaboradora'` or `also_collaborator=1`).
- Tenant boundary: every feed item, support, save, and supporter lookup is restricted to `auth.companyId` and the target post's `company_id`.
- Publisher: RH or company admin. The card shows the company/trade name, never the employee author identity.
- Content: curated editorial items with title, summary, body text, topic, read time, and an approved local image path or no image.
- Ordering: `published_at DESC, created_at DESC`; no engagement ranking.
- Collaborator actions: read, filter by topic, support, remove support, save, remove save, view opted-in supporter names on demand.
- Privacy defaults: support count is aggregate; supporter names are hidden unless the supporter has explicitly enabled `privacy_community_supporter_name`; check-ins, semaforo, NR-1 answers, scores, and classifications never enter the feed.
- Company control: `feed_company_enabled=0` returns an empty disabled state and prevents post reads and writes for collaborators.
- Out of scope for this release: collaborator-created posts, comments, direct messages, public profiles, department/group feed, ranking, recommendation algorithm, health data, and external image URLs.

## File Map Before Coding

Create or modify only these boundaries:

- Create `src/lib/db/migrations/054_company_community_feed.sql`: posts, supports, saves, indexes, and explicit default-off company settings.
- Create `src/types/community.ts`: DTOs and status/topic unions shared by service, API, and UI.
- Create `src/lib/community/schemas.ts`: Zod schemas for filters, pagination, post management, and support/save actions.
- Create `src/repositories/community.repository.ts`: parameterized reads/writes with `company_id` required in every query.
- Create `src/services/community.service.ts`: tenant policy, publication rules, safe response mapping, and supporter-name policy.
- Create `src/app/api/collaborator/feed/[id]/support/route.ts`, `src/app/api/collaborator/feed/[id]/save/route.ts`, `src/app/api/collaborator/feed/[id]/supporters/route.ts`, and `src/app/api/collaborator/saved/route.ts`.
- Replace the contained implementation in `src/app/api/collaborator/feed/route.ts` with the company-scoped read contract after the new service exists.
- Create `src/app/api/rh/community/posts/route.ts` and `src/app/api/rh/community/posts/[id]/route.ts` for company-scoped editorial management.
- Create `src/app/(platform)/comunidade/page.tsx` and focused components under `src/components/community/` for the collaborator feed.
- Create `src/app/(platform)/comunidade/gerenciar/page.tsx` for the minimal RH/admin publish workflow.
- Modify `src/hooks/useCollaborator.ts` to remove the unsupported `group` scope and expose typed feed mutations.
- Modify `src/app/api/users/me/preferences/route.ts` and `src/app/(platform)/configuracoes/page.tsx` to persist the supporter-name opt-in through the existing preferences contract.
- Modify `src/app/api/company/route.ts` and `src/app/(platform)/company-profile/page.tsx` to make the company feed switch explicit and default-off.
- Modify `src/components/platform/navigation.ts` and `src/components/platform/SidebarNavItem.tsx` only when the management route is functional and tested.
- The mobile-shell integration is already complete in `AppLayout`; this plan must only replace the containment adapter after the company-scoped data contract is green.
- Modify `public/api-docs.json`, `docs/APIS_CRITICAS.md`, `docs/PERFIS_E_PERMISSOES.md`, `docs/MAPA_TELAS.md`, and the visual audit spec after the API contract is stable.
- Create `tests/unit/community-policy.test.ts`, `tests/unit/community-repository.test.ts`, and `tests/e2e/community-feed.spec.ts`.

### Task 1: Lock the database and tenant contract

**Files:**
- Create: `src/lib/db/migrations/054_company_community_feed.sql`
- Create: `src/types/community.ts`
- Test: `tests/unit/community-policy.test.ts`

- [ ] **Step 1: Define the SQL schema and indexes.** Use these columns and constraints:

```sql
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body_text TEXT NOT NULL,
  topic TEXT NOT NULL,
  read_time_minutes INTEGER NOT NULL DEFAULT 5,
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'archived')),
  published_at TEXT,
  expires_at TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  updated_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS community_post_supports (
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS community_post_saves (
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_company_status
  ON community_posts(company_id, status, published_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_company_topic
  ON community_posts(company_id, topic, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_supports_post
  ON community_post_supports(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_saves_user
  ON community_post_saves(user_id, created_at DESC);

INSERT INTO company_settings (id, company_id, setting_key, setting_value, updated_at)
SELECT lower(hex(randomblob(16))), c.id, 'feed_company_enabled', '0', datetime('now')
FROM companies c
WHERE NOT EXISTS (
  SELECT 1 FROM company_settings s
  WHERE s.company_id = c.id AND s.setting_key = 'feed_company_enabled'
);
```

- [ ] **Step 2: Define the shared types.** The read DTO must not contain company IDs or health data:

```ts
export const COMMUNITY_TOPICS = ['pausas', 'sono', 'movimento', 'cuidado', 'geral'] as const;
export type CommunityTopic = (typeof COMMUNITY_TOPICS)[number];
export type CommunityPostStatus = 'draft' | 'published' | 'archived';

export interface CommunityFeedItem {
  id: string;
  title: string;
  summary: string;
  bodyText: string;
  topic: CommunityTopic;
  readTimeMinutes: number;
  imagePath: string | null;
  publishedAt: string;
  supportCount: number;
  supportedByMe: boolean;
  savedByMe: boolean;
}

export interface CommunityFeedResponse {
  items: CommunityFeedItem[];
  nextCursor: string | null;
  scope: 'company';
  settings: { companyFeedEnabled: boolean };
}
```

- [ ] **Step 3: Add failing unit tests for tenant and privacy policy.** Cover: missing company ID is denied; a post from company B is invisible to company A; disabled company returns no items; supporter name is hidden when preference is absent or `0`; health fields are not present in the DTO.

- [ ] **Step 4: Run the focused test and confirm it fails before implementation.**

Run: `npm run test:unit -- tests/unit/community-policy.test.ts`

Expected: FAIL because the community policy/service modules do not exist yet.

### Task 2: Implement repository and service boundaries

**Files:**
- Create: `src/repositories/community.repository.ts`
- Create: `src/services/community.service.ts`
- Create: `src/lib/community/schemas.ts`
- Test: `tests/unit/community-repository.test.ts`

- [ ] **Step 1: Define Zod input schemas.** Enforce `limit` between 1 and 30, opaque cursor format, topic enum, title length 3-120, summary length 10-240, body length 20-8000, read time 1-60, and local image paths beginning with `/` while rejecting `http://`, `https://`, `//`, and `javascript:`.

- [ ] **Step 2: Implement repository queries with company ID in every predicate.** The feed query must join support/save aggregates and use `EXISTS` for the current user. It must filter `status='published'`, `deleted_at IS NULL`, `published_at <= datetime('now')`, and `expires_at IS NULL OR expires_at > datetime('now')`.

- [ ] **Step 3: Implement cursor pagination.** Encode the last `(published_at, created_at, id)` tuple as base64url JSON; decode and validate it before adding the keyset predicate. Do not use a client-supplied offset or company ID.

- [ ] **Step 4: Implement service policy.** Resolve the company only from `auth.companyId`, verify the authenticated user belongs to it, and return the disabled state before querying posts. The service must expose no raw database rows.

- [ ] **Step 5: Implement idempotent support/save mutations.** `INSERT OR IGNORE` adds a relation; `DELETE` removes only the current user's relation. Both operations must re-check that the post is published, active, and belongs to the authenticated company. Route authorization must use `withAuth` plus `hasCollaboratorSelfCapability`; writes must use `enqueueCollaboratorSelfWrite` so dual-role users retain their collaborator view without granting access to ordinary RH/leadership sessions.

- [ ] **Step 6: Implement supporter lookup as a separate on-demand query.** Return only users in the same company who support the same post and whose `user_preferences.pref_key = 'privacy_community_supporter_name'` has value `1`. Return a display name from nickname when present, otherwise the first name; never return email, department, role, user ID, or full health/profile data.

- [ ] **Step 7: Run the repository tests.**

Run: `npm run test:unit -- tests/unit/community-policy.test.ts tests/unit/community-repository.test.ts`

Expected: PASS, including cross-company and disabled-feed cases.

### Task 3: Replace the contained collaborator API with the real company feed

**Files:**
- Modify: `src/app/api/collaborator/feed/route.ts`
- Create: `src/app/api/collaborator/feed/[id]/support/route.ts`
- Create: `src/app/api/collaborator/feed/[id]/save/route.ts`
- Create: `src/app/api/collaborator/feed/[id]/supporters/route.ts`
- Create: `src/app/api/collaborator/saved/route.ts`
- Modify: `src/hooks/useCollaborator.ts`
- Test: `tests/e2e/community-feed.spec.ts`

- [ ] **Step 1: Make `GET /api/collaborator/feed` accept only `scope=company`.** Reject `scope=group` with `422` and a stable error code until department/group tenancy is separately designed. Return the typed response from the service and keep `Cache-Control: private, no-store` through `withAuth`.

- [ ] **Step 2: Add support and save routes.** Use `withAuth`, `hasCollaboratorSelfCapability`, `enqueueCollaboratorSelfWrite`, `checkWriteRateLimit`, and no request body for create/delete operations. Return `{ supportCount, supportedByMe }` or `{ savedByMe }`; do not return a post body from mutations.

- [ ] **Step 3: Add `GET /supporters`.** Require the same company and published post checks, paginate names with `limit <= 20`, and return `{ names, nextCursor }`. An empty list is valid and does not reveal how many supporters opted out.

- [ ] **Step 4: Add saved-items read.** `GET /api/collaborator/saved` returns the same safe card DTO, restricted to the current user's saves and current company.

- [ ] **Step 5: Update `useCollaboratorFeed`.** Remove the `group` option, use the typed `CommunityFeedResponse`, expose `support`, `unsupport`, `save`, `unsave`, and keep SWR revalidation after mutations. Add a separate `useCollaboratorSaved` hook.

- [ ] **Step 6: Add e2e isolation tests.** Create two companies, publish one post per company, authenticate collaborators from both, and assert company A cannot see or mutate company B's post by ID. Also assert disabled company, unauthenticated requests, invalid topic/cursor, duplicate support, save removal, and opted-in supporter names.

- [ ] **Step 7: Run the API tests.**

Run: `cd tests; npx playwright test e2e/community-feed.spec.ts --config=playwright.config.ts`

Expected: PASS with no company B sentinel in company A responses and no email/role/user ID in supporter payloads.

### Task 4: Add RH/admin content management

**Files:**
- Create: `src/app/api/rh/community/posts/route.ts`
- Create: `src/app/api/rh/community/posts/[id]/route.ts`
- Create: `src/app/(platform)/comunidade/gerenciar/page.tsx`
- Modify: `src/app/(platform)/company-profile/page.tsx`
- Modify: `src/app/api/company/route.ts`
- Test: `tests/e2e/community-feed.spec.ts`

- [ ] **Step 1: Add a company-scoped list/create route.** Use `withRole('rh', 'admin')`. RH and company admin may create only with `auth.companyId`; master admin may target an explicitly selected company after verifying that company exists. Validate all fields with the shared Zod schema.

- [ ] **Step 2: Add update/archive route.** Select by `id AND company_id AND deleted_at IS NULL`. Allow title, summary, body, topic, read time, image path, publication/expiration dates, and status transitions `draft -> published -> archived`; do not hard-delete posts.

- [ ] **Step 3: Enforce publication policy.** A post cannot publish while the company feed is disabled. Publishing sets `published_at` once, records `updated_by`, and writes an audit log entry with actor, company, post ID, and action. The body is plain text; no `dangerouslySetInnerHTML` or arbitrary HTML.

- [ ] **Step 4: Make the company switch explicit.** Change missing `feed_company_enabled` to `false` in the company API, keep the setting write scoped to the authenticated company, and label the existing control as the company community feed switch. The first migration seeds existing companies to `0` so activation is intentional.

- [ ] **Step 5: Build the minimal management UI.** Include list/filter by status, create/edit form, preview of plain text, publish/archive actions, disabled-feed warning, validation feedback, and an empty state. Do not add collaborator posting controls.

- [ ] **Step 6: Add role/tenant tests.** RH from company A cannot read, edit, publish, or archive company B content. Collaborators receive `403` on management routes. Master admin behavior is covered explicitly rather than inferred from `role='admin'`.

### Task 5: Build the collaborator community route

**Files:**
- Create: `src/app/(platform)/comunidade/page.tsx`
- Create: `src/components/community/CommunityFeed.tsx`
- Create: `src/components/community/CommunityPostCard.tsx`
- Create: `src/components/community/CommunityTopicTabs.tsx`
- Modify: `src/hooks/useCollaborator.ts`

- [ ] **Step 1: Render the approved first-release states.** Implement loading skeleton, feed content, disabled-company state, empty state, error/retry state, and end-of-feed state using `FeedbackState` and existing platform tokens.

- [ ] **Step 2: Match the visual contract without fictional assets.** Use the real UniHER/company logo contract, `Avatar` only where an opted-in name is explicitly opened, existing icon primitives, and plain text content. Do not add generated botanical logos, portraits, or generated photos to `public/`.

- [ ] **Step 3: Implement topic tabs and card actions.** Keep `Para voce`, `Todos`, `Pausas`, `Sono`, and `Movimento` mapped to the typed topic set; use accessible buttons with loading/disabled states; keep save private and support aggregate.

- [ ] **Step 4: Implement the supporter disclosure interaction.** The default card shows only the aggregate count. A deliberate tap opens a small list fetched from `/supporters`; the UI states that names appear only with consent and supports anonymous fallback without exposing identities.

- [ ] **Step 5: Add route and responsive visual checks.** Verify `/comunidade` at 390x844, 375x812, 768, and 1440 widths with no horizontal overflow, 44px minimum touch targets, keyboard focus, reduced motion, contrast, and no overlap with the existing drawer/topbar.

### Task 6: Persist the privacy preference and connect Perfil

**Files:**
- Modify: `src/app/api/users/me/preferences/route.ts`
- Modify: `src/app/(platform)/configuracoes/page.tsx`
- Test: `tests/e2e/community-feed.spec.ts`

- [ ] **Step 1: Add `privacy_community_supporter_name` to the preference allowlist.** Default to `0` when absent; load and persist through the existing `/api/users/me/preferences` contract.

- [ ] **Step 2: Add the explicit toggle to the privacy section.** Label it `Mostrar meu nome ao apoiar`, explain that it is off by default and applies only to future supporter-name views, and show a confirmation/error state after persistence.

- [ ] **Step 3: Keep revocation immediate.** When the value changes from `1` to `0`, subsequent supporter queries must hide that user without deleting their support history. The support count remains aggregate.

- [ ] **Step 4: Audit preference changes.** Extend the preference handler to write an audit event for this key without logging the value into application logs. Add tests that the preference is not returned to another user and that revocation takes effect immediately.

### Task 7: Integrate navigation and documentation after the route is green

**Files:**
- Modify: `src/components/platform/navigation.ts`
- Modify: `src/components/platform/SidebarNavItem.tsx`
- Modify: `docs/APIS_CRITICAS.md`
- Modify: `docs/PERFIS_E_PERMISSOES.md`
- Modify: `docs/MAPA_TELAS.md`
- Modify: `public/api-docs.json`
- Modify: `docs/superpowers/specs/2026-07-20-uniher-nr1-front-visual-audit.md`

- [ ] **Step 1: Add collaborator navigation only after the real `/comunidade` feed works.** The mobile shell already exposes `Comunidade` and keeps `Perfil` mapped to `/configuracoes`; this step is complete only after the containment adapter is replaced by the tested company-scoped feed.

- [ ] **Step 2: Add RH management navigation only after CRUD tests pass.** Use a dedicated community icon in the existing icon map; do not overload a misleading existing icon.

- [ ] **Step 3: Document all routes and roles.** Record auth, company scope, pagination, disabled-feed behavior, errors, support/save semantics, and supporter-name privacy in `docs/APIS_CRITICAS.md` and `public/api-docs.json`.

- [ ] **Step 4: Update screen and permission maps.** Mark `/comunidade` as collaborator-only and `/comunidade/gerenciar` as RH/company-admin scoped. State that the old `/api/collaborator/feed` containment is replaced only by the tested company-scoped contract.

- [ ] **Step 5: Link this plan from the visual audit.** Keep the image audit honest: approved screens are visual direction; implementation status becomes functional only after API, tenant, privacy, and responsive gates pass.

### Task 8: Independent verification and release gate - COMPLETE

**Files:**
- Test: `tests/unit/community-policy.test.ts`
- Test: `tests/unit/community-repository.test.ts`
- Test: `tests/e2e/community-feed.spec.ts`
- Test: `tests/e2e/visual-ux.spec.ts`

- [x] **Step 1: Run focused and complete unit tests.**

Run: focused Community tests during implementation, followed by `npm run test:unit`.

Receipt: **PASS, 470/470 tests in 51 files** on integral HEAD `006770f`. That commit adds the collaborator-company docs/OpenAPI parity test; the complete suite, not only the focused test, was verified at that HEAD.

- [x] **Step 2: Run the Community and shell E2E matrix.**

Run: `cd tests; npx playwright test --config=playwright.config.ts --project=community-feed --project=community-feed-ui --project=mobile-shell --project=privacy-wave-1-1 --project=seguranca`

Receipt: **PASS, 65/65 on `908357f`, then PASS, 65/65 again after the mobile external-host guard, with 3 workers and zero retries**, covering company isolation, role boundaries, support/save idempotence, preference revocation, disabled state, pagination, mobile shell, and security/privacy containment. Both executions are attributed to the branch state at `908357f`, before `006770f`; no unrecorded SHA is inferred.

- [x] **Step 3: Preserve the existing privacy and security suite.**

Run: included as the `privacy-wave-1-1` and `seguranca` projects in the integrated matrix above.

Receipt: **PASS** with existing containment guarantees unchanged and no health-derived payload in Community responses.

- [x] **Step 4: Run build and visual checks.**

Run: `npm run build` and `cd tests; npx playwright test --project=visual-ux --config=playwright.config.ts`.

Receipt: build on integral HEAD `006770f` **PASS** with **137 routes/pages generated** and only the two known, pre-existing NFT trace warnings from `next.config.ts` to `src/app/api/admin/system/ops/route.ts`; `visual-ux` on `f87c5fd` **PASS, 21/21 in two consecutive executions**. Community screenshots cover `375x812`, `390x844`, `768x900`, and `1440x1000`; the mobile-shell screenshot remains in the current Playwright result path recorded by the visual audit.

- [x] **Step 5: Close the gate only when all conditions pass.** **CLOSED across the gate-specific evidence SHAs above**: feed is off by default, every query is company-scoped, collaborator writes are limited to own support/save, names are opt-in, no health data is present, admin/RH CRUD is tested, and the visual audit uses real UniHER assets. Quality findings were closed by `ab419f3`, `8305edd`, `f0af53c`, `f87c5fd`, `4b3fcfc`, `4511eb2`, `908357f`, and `006770f`.

Documentation boundary: this checklist is the canonical release receipt for visual verification on `f87c5fd`, E2E verification on `908357f`, and complete unit/build verification on `006770f`. Its docs-only commit is intentionally not described as a tested runtime revision.

## Self-review

- Spec coverage: product contract, tenancy, schema, API, authoring, UI, privacy preference, navigation, documentation, tests, and release gates are covered above.
- No implementation step relies on a client-supplied company ID for collaborator reads or mutations.
- The existing `feed_company_enabled` flag is retained as the company kill switch and made explicit/default-off before publication.
- Department/group feed is intentionally excluded from this plan; it requires a separate audience and membership contract.
- NR-1, check-ins, semaforo, scores, and classifications remain outside the community domain.
