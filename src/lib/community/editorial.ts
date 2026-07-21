import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

import { AppError } from '@/lib/errors';
import type {
  CommunityPostCreateInput,
  CommunityPostPatchInput,
} from '@/lib/community/schemas';
import type { CommunityPostStatus, CommunityTopic } from '@/types/community';

export type EditorialAuth = {
  userId: string;
  role: string;
  companyId?: string | null;
  isMasterAdmin?: boolean;
};

type EditorialActorRow = {
  id: string;
  company_id: string | null;
  email: string;
  role: string;
  is_master_admin: number;
};

type EditorialPostRow = {
  id: string;
  company_id: string;
  title: string;
  summary: string;
  body_text: string;
  topic: CommunityTopic;
  read_time_minutes: number;
  image_path: string | null;
  status: CommunityPostStatus;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EditorialPostDto = {
  id: string;
  title: string;
  summary: string;
  bodyText: string;
  topic: CommunityTopic;
  readTimeMinutes: number;
  imagePath: string | null;
  status: CommunityPostStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function canonicalUtc(value: string): string {
  const withTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)
    ? value
    : `${value.replace(' ', 'T')}Z`;
  const date = new Date(withTimezone);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid persisted community timestamp');
  return date.toISOString();
}

function mapEditorialPost(row: EditorialPostRow): EditorialPostDto {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    bodyText: row.body_text,
    topic: row.topic,
    readTimeMinutes: row.read_time_minutes,
    imagePath: row.image_path,
    status: row.status,
    publishedAt: row.published_at ? canonicalUtc(row.published_at) : null,
    expiresAt: row.expires_at ? canonicalUtc(row.expires_at) : null,
    createdAt: canonicalUtc(row.created_at),
    updatedAt: canonicalUtc(row.updated_at),
  };
}

function requireEditorialActor(database: Database.Database, auth: EditorialAuth): EditorialActorRow {
  const actor = database.prepare(`
    SELECT id, company_id, email, role, is_master_admin
    FROM users
    WHERE id = ?
      AND deleted_at IS NULL
      AND COALESCE(blocked, 0) = 0
      AND COALESCE(approved, 0) = 1
  `).get(auth.userId) as EditorialActorRow | undefined;

  if (!actor || !['rh', 'admin'].includes(actor.role) || actor.role !== auth.role) {
    throw new AppError('Editorial actor is not active', 403, 'EDITORIAL_ACTOR_FORBIDDEN');
  }
  if (auth.isMasterAdmin === true && actor.is_master_admin !== 1) {
    throw new AppError('Editorial actor is not a master admin', 403, 'EDITORIAL_ACTOR_FORBIDDEN');
  }
  return actor;
}

export function resolveEditorialCompany(
  database: Database.Database,
  auth: EditorialAuth,
  explicitCompanyId?: string,
): { actor: EditorialActorRow; companyId: string } {
  const actor = requireEditorialActor(database, auth);
  const masterAdmin = auth.isMasterAdmin === true && actor.is_master_admin === 1;
  const requestedCompanyId = explicitCompanyId?.trim();

  if (requestedCompanyId && !masterAdmin) {
    throw new AppError('Explicit company targeting is forbidden', 403, 'COMPANY_TARGET_FORBIDDEN');
  }

  let companyId: string | null | undefined;
  if (masterAdmin) {
    companyId = requestedCompanyId;
  } else {
    if (!actor.company_id || actor.company_id !== auth.companyId) {
      throw new AppError('Editorial company membership is invalid', 403, 'EDITORIAL_ACTOR_FORBIDDEN');
    }
    companyId = auth.companyId;
  }

  if (!companyId) {
    throw new AppError('Company selection is required', 400, 'COMPANY_REQUIRED');
  }

  const company = database.prepare(`
    SELECT id
    FROM companies
    WHERE id = ? AND COALESCE(is_active, 0) = 1 AND deleted_at IS NULL
  `).get(companyId) as { id: string } | undefined;
  if (!company) throw new AppError('Company not found', 404, 'COMPANY_NOT_FOUND');

  return { actor, companyId };
}

function isFeedEnabled(database: Database.Database, companyId: string): boolean {
  const setting = database.prepare(`
    SELECT setting_value
    FROM company_settings
    WHERE company_id = ? AND setting_key = 'feed_company_enabled'
    LIMIT 1
  `).get(companyId) as { setting_value: string } | undefined;
  return setting?.setting_value === '1';
}

function requireFeedEnabled(database: Database.Database, companyId: string): void {
  if (!isFeedEnabled(database, companyId)) {
    throw new AppError('Company community feed is disabled', 409, 'FEED_DISABLED');
  }
}

function getPostRow(
  database: Database.Database,
  postId: string,
  companyId: string,
): EditorialPostRow {
  const row = database.prepare(`
    SELECT id, company_id, title, summary, body_text, topic, read_time_minutes,
           image_path, status, published_at, expires_at, created_at, updated_at
    FROM community_posts
    WHERE id = ? AND company_id = ? AND deleted_at IS NULL
  `).get(postId, companyId) as EditorialPostRow | undefined;
  if (!row) throw new AppError('Community post not found', 404, 'COMMUNITY_POST_NOT_FOUND');
  return row;
}

function auditPostAction(
  database: Database.Database,
  actor: EditorialActorRow,
  companyId: string,
  postId: string,
  action: 'create' | 'update' | 'publish' | 'archive',
): void {
  database.prepare(`
    INSERT INTO audit_logs (
      id, actor_id, actor_email, actor_role, action, entity_type, entity_id, details
    ) VALUES (?, ?, ?, ?, ?, 'community_post', ?, ?)
  `).run(
    nanoid(),
    actor.id,
    actor.email,
    actor.role,
    `community_post_${action}`,
    postId,
    JSON.stringify({ companyId, postId, action }),
  );
}

export function listEditorialPosts(
  database: Database.Database,
  auth: EditorialAuth,
  explicitCompanyId?: string,
  status?: CommunityPostStatus,
): {
  companyId: string;
  status: CommunityPostStatus | null;
  items: EditorialPostDto[];
  settings: { companyFeedEnabled: boolean };
} {
  const { companyId } = resolveEditorialCompany(database, auth, explicitCompanyId);
  const rows = (status
    ? database.prepare(`
        SELECT id, company_id, title, summary, body_text, topic, read_time_minutes,
               image_path, status, published_at, expires_at, created_at, updated_at
        FROM community_posts
        WHERE company_id = ? AND status = ? AND deleted_at IS NULL
        ORDER BY updated_at DESC, created_at DESC, id DESC
      `).all(companyId, status)
    : database.prepare(`
        SELECT id, company_id, title, summary, body_text, topic, read_time_minutes,
               image_path, status, published_at, expires_at, created_at, updated_at
        FROM community_posts
        WHERE company_id = ? AND deleted_at IS NULL
        ORDER BY updated_at DESC, created_at DESC, id DESC
      `).all(companyId)) as EditorialPostRow[];
  return {
    companyId,
    status: status ?? null,
    items: rows.map(mapEditorialPost),
    settings: { companyFeedEnabled: isFeedEnabled(database, companyId) },
  };
}

export function getEditorialPost(
  database: Database.Database,
  auth: EditorialAuth,
  postId: string,
  explicitCompanyId?: string,
): { post: EditorialPostDto } {
  const { companyId } = resolveEditorialCompany(database, auth, explicitCompanyId);
  return { post: mapEditorialPost(getPostRow(database, postId, companyId)) };
}

export function createEditorialPost(
  database: Database.Database,
  auth: EditorialAuth,
  explicitCompanyId: string | undefined,
  input: CommunityPostCreateInput,
  now: string,
): { post: EditorialPostDto } {
  const transaction = database.transaction(() => {
    const { actor, companyId } = resolveEditorialCompany(database, auth, explicitCompanyId);
    if (input.status === 'archived') {
      throw new AppError('A post cannot be created archived', 409, 'COMMUNITY_TRANSITION_INVALID');
    }
    if (input.status === 'published') requireFeedEnabled(database, companyId);

    const postId = nanoid();
    const publishedAt = input.status === 'published' ? now : null;
    database.prepare(`
      INSERT INTO community_posts (
        id, company_id, title, summary, body_text, topic, read_time_minutes,
        image_path, status, published_at, expires_at, created_by, updated_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      postId,
      companyId,
      input.title,
      input.summary,
      input.bodyText,
      input.topic,
      input.readTimeMinutes,
      input.imagePath ?? null,
      input.status,
      publishedAt,
      input.expiresAt ?? null,
      actor.id,
      actor.id,
      now,
      now,
    );
    auditPostAction(database, actor, companyId, postId, 'create');
    if (input.status === 'published') auditPostAction(database, actor, companyId, postId, 'publish');
    return { post: mapEditorialPost(getPostRow(database, postId, companyId)) };
  });
  return transaction.immediate();
}

function transitionAction(
  current: CommunityPostStatus,
  target: CommunityPostStatus,
): 'update' | 'publish' | 'archive' {
  if (current === 'archived') {
    throw new AppError('Archived community posts are terminal', 409, 'COMMUNITY_TRANSITION_INVALID');
  }
  if (current === target) return 'update';
  if (current === 'draft' && target === 'published') return 'publish';
  if (current === 'published' && target === 'archived') return 'archive';
  throw new AppError('Invalid community post status transition', 409, 'COMMUNITY_TRANSITION_INVALID');
}

export function patchEditorialPost(
  database: Database.Database,
  auth: EditorialAuth,
  postId: string,
  explicitCompanyId: string | undefined,
  input: CommunityPostPatchInput,
  now: string,
): { post: EditorialPostDto } {
  const transaction = database.transaction(() => {
    const { actor, companyId } = resolveEditorialCompany(database, auth, explicitCompanyId);
    const current = getPostRow(database, postId, companyId);
    const targetStatus = input.status ?? current.status;
    const action = transitionAction(current.status, targetStatus);
    if (action === 'publish') requireFeedEnabled(database, companyId);

    database.prepare(`
      UPDATE community_posts
      SET title = ?, summary = ?, body_text = ?, topic = ?, read_time_minutes = ?,
          image_path = ?, status = ?, published_at = ?, expires_at = ?,
          updated_by = ?, updated_at = ?
      WHERE id = ? AND company_id = ? AND deleted_at IS NULL
    `).run(
      input.title ?? current.title,
      input.summary ?? current.summary,
      input.bodyText ?? current.body_text,
      input.topic ?? current.topic,
      input.readTimeMinutes ?? current.read_time_minutes,
      input.imagePath === undefined ? current.image_path : input.imagePath,
      targetStatus,
      action === 'publish' ? (current.published_at ?? now) : current.published_at,
      input.expiresAt === undefined ? current.expires_at : input.expiresAt,
      actor.id,
      now,
      postId,
      companyId,
    );
    auditPostAction(database, actor, companyId, postId, action);
    return { post: mapEditorialPost(getPostRow(database, postId, companyId)) };
  });
  return transaction.immediate();
}
