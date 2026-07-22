import type Database from 'better-sqlite3';
import type { CommunityFeedCursor, CommunitySupporterCursor } from '@/lib/community/cursor';
import type { CommunityFeedItem, CommunityTopic } from '@/types/community';

type FeedRow = {
  id: string;
  title: string;
  summary: string;
  body_text: string;
  topic: CommunityTopic;
  read_time_minutes: number;
  image_path: string | null;
  published_at: string;
  created_at: string;
  support_count: number;
  supported_by_me: number;
  saved_by_me: number;
};

type SupporterRow = {
  support_row_id: number;
  name: string;
  nickname: string | null;
  created_at: string;
};

export type CommunityPostRelationInput = {
  postId: string;
  userId: string;
  companyId: string;
  now: string;
};

export type CommunityFeedPage = {
  items: CommunityFeedItem[];
  nextCursorTuple: CommunityFeedCursor | null;
};

export type CommunitySupporterPage = {
  names: string[];
  nextCursorTuple: CommunitySupporterCursor | null;
};

export interface CommunityRepository {
  isActiveMember(userId: string, companyId: string): boolean;
  isFeedEnabled(companyId: string): boolean;
  listFeed(input: {
    userId: string;
    companyId: string;
    topic?: CommunityTopic;
    cursor?: CommunityFeedCursor;
    limit: number;
    now: string;
  }): CommunityFeedPage;
  listSaved(input: {
    userId: string;
    companyId: string;
    cursor?: CommunityFeedCursor;
    limit: number;
    now: string;
  }): CommunityFeedPage;
  hasActivePublishedPost(postId: string, companyId: string, now: string): boolean;
  addSupport(input: CommunityPostRelationInput): void;
  removeSupport(input: CommunityPostRelationInput): void;
  getSupportState(input: CommunityPostRelationInput): { supportCount: number; supportedByMe: boolean };
  addSave(input: CommunityPostRelationInput): void;
  removeSave(input: CommunityPostRelationInput): void;
  isSaved(input: CommunityPostRelationInput): boolean;
  listSupporters(input: {
    postId: string;
    companyId: string;
    cursor?: CommunitySupporterCursor;
    limit: number;
    now?: string;
  }): CommunitySupporterPage;
}

function tableColumns(database: Database.Database, table: string): Set<string> {
  const rows = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

function activeUserConditions(columns: Set<string>, alias: string): string[] {
  const conditions: string[] = [];
  if (columns.has('deleted_at')) conditions.push(`${alias}.deleted_at IS NULL`);
  if (columns.has('blocked')) conditions.push(`COALESCE(${alias}.blocked, 0) = 0`);
  if (columns.has('approved')) conditions.push(`COALESCE(${alias}.approved, 0) = 1`);
  if (columns.has('is_active')) conditions.push(`COALESCE(${alias}.is_active, 0) = 1`);
  if (columns.has('status')) conditions.push(`${alias}.status = 'active'`);
  return conditions;
}

function mapFeedItem(row: FeedRow): CommunityFeedItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    bodyText: row.body_text,
    topic: row.topic,
    readTimeMinutes: row.read_time_minutes,
    imagePath: row.image_path,
    publishedAt: row.published_at,
    supportCount: row.support_count,
    supportedByMe: row.supported_by_me === 1,
    savedByMe: row.saved_by_me === 1,
  };
}

function postVisibilitySql(alias: string): string {
  return `
    ${alias}.company_id = @companyId
    AND ${alias}.status = 'published'
    AND ${alias}.deleted_at IS NULL
    AND ${alias}.published_at <= @now
    AND (${alias}.expires_at IS NULL OR ${alias}.expires_at > @now)
  `;
}

function feedCursorSql(alias: string, cursor?: CommunityFeedCursor): string {
  if (!cursor) return '';
  return `AND (
    ${alias}.published_at < @cursorPublishedAt
    OR (${alias}.published_at = @cursorPublishedAt AND ${alias}.created_at < @cursorCreatedAt)
    OR (${alias}.published_at = @cursorPublishedAt AND ${alias}.created_at = @cursorCreatedAt AND ${alias}.id < @cursorId)
  )`;
}

function feedParams(input: {
  userId: string;
  companyId: string;
  cursor?: CommunityFeedCursor;
  limit: number;
  now: string;
}): Record<string, string | number | null> {
  return {
    userId: input.userId,
    companyId: input.companyId,
    now: input.now,
    fetchLimit: input.limit + 1,
    cursorPublishedAt: input.cursor?.[0] ?? null,
    cursorCreatedAt: input.cursor?.[1] ?? null,
    cursorId: input.cursor?.[2] ?? null,
  };
}

function mapFeedPage(rows: FeedRow[], limit: number): CommunityFeedPage {
  const pageRows = rows.slice(0, limit);
  const last = pageRows.at(-1);
  return {
    items: pageRows.map(mapFeedItem),
    nextCursorTuple: rows.length > limit && last
      ? [last.published_at, last.created_at, last.id]
      : null,
  };
}

export function createCommunityRepository(database: Database.Database): CommunityRepository {
  const userColumns = tableColumns(database, 'users');
  const userActive = activeUserConditions(userColumns, 'u');
  const relationUserActive = activeUserConditions(userColumns, 'relation_user');
  const activeRelationMembershipSql = `
    relation_user.id = @userId
    AND relation_user.company_id = @companyId
    ${relationUserActive.map((condition) => `AND ${condition}`).join('\n')}
    AND relation_company.id = @companyId
    AND COALESCE(relation_company.is_active, 0) = 1
    AND relation_company.deleted_at IS NULL
  `;

  return {
    isActiveMember(userId, companyId) {
      if (!userColumns.has('company_id')) return false;
      const row = database.prepare(`
        SELECT 1 AS allowed
        FROM users u
        JOIN companies c ON c.id = u.company_id
        WHERE u.id = @userId
          AND u.company_id = @companyId
          AND COALESCE(c.is_active, 0) = 1
          AND c.deleted_at IS NULL
          ${userActive.map((condition) => `AND ${condition}`).join('\n')}
        LIMIT 1
      `).get({ userId, companyId }) as { allowed: number } | undefined;
      return row?.allowed === 1;
    },

    isFeedEnabled(companyId) {
      const row = database.prepare(`
        SELECT setting_value
        FROM company_settings
        WHERE company_id = ? AND setting_key = 'feed_company_enabled'
        LIMIT 1
      `).get(companyId) as { setting_value: string } | undefined;
      return row?.setting_value === '1';
    },

    listFeed(input) {
      const rows = database.prepare(`
        SELECT
          p.id, p.title, p.summary, p.body_text, p.topic, p.read_time_minutes,
          p.image_path, p.published_at, p.created_at,
          (SELECT COUNT(*) FROM community_post_supports ps WHERE ps.post_id = p.id) AS support_count,
          EXISTS(SELECT 1 FROM community_post_supports ps WHERE ps.post_id = p.id AND ps.user_id = @userId) AS supported_by_me,
          EXISTS(SELECT 1 FROM community_post_saves sv WHERE sv.post_id = p.id AND sv.user_id = @userId) AS saved_by_me
        FROM community_posts p
        WHERE ${postVisibilitySql('p')}
          ${input.topic ? 'AND p.topic = @topic' : ''}
          ${feedCursorSql('p', input.cursor)}
        ORDER BY p.published_at DESC, p.created_at DESC, p.id DESC
        LIMIT @fetchLimit
      `).all({ ...feedParams(input), topic: input.topic ?? null }) as FeedRow[];
      return mapFeedPage(rows, input.limit);
    },

    listSaved(input) {
      const rows = database.prepare(`
        SELECT
          p.id, p.title, p.summary, p.body_text, p.topic, p.read_time_minutes,
          p.image_path, p.published_at, p.created_at,
          (SELECT COUNT(*) FROM community_post_supports ps WHERE ps.post_id = p.id) AS support_count,
          EXISTS(SELECT 1 FROM community_post_supports ps WHERE ps.post_id = p.id AND ps.user_id = @userId) AS supported_by_me,
          1 AS saved_by_me
        FROM community_post_saves own_save
        JOIN community_posts p ON p.id = own_save.post_id
        WHERE own_save.user_id = @userId
          AND ${postVisibilitySql('p')}
          ${feedCursorSql('p', input.cursor)}
        ORDER BY p.published_at DESC, p.created_at DESC, p.id DESC
        LIMIT @fetchLimit
      `).all(feedParams(input)) as FeedRow[];
      return mapFeedPage(rows, input.limit);
    },

    hasActivePublishedPost(postId, companyId, now) {
      const row = database.prepare(`
        SELECT 1 AS found
        FROM community_posts p
        WHERE p.id = @postId AND ${postVisibilitySql('p')}
        LIMIT 1
      `).get({ postId, companyId, now }) as { found: number } | undefined;
      return row?.found === 1;
    },

    addSupport(input) {
      database.prepare(`
        INSERT OR IGNORE INTO community_post_supports (post_id, user_id, created_at)
        SELECT p.id, @userId, @now
        FROM community_posts p
        JOIN users relation_user ON relation_user.id = @userId
        JOIN companies relation_company ON relation_company.id = relation_user.company_id
        WHERE p.id = @postId
          AND ${postVisibilitySql('p')}
          AND ${activeRelationMembershipSql}
      `).run(input);
    },

    removeSupport(input) {
      database.prepare(`
        DELETE FROM community_post_supports
        WHERE post_id = @postId
          AND user_id = @userId
          AND EXISTS (
            SELECT 1
            FROM community_posts p
            JOIN users relation_user ON relation_user.id = @userId
            JOIN companies relation_company ON relation_company.id = relation_user.company_id
            WHERE p.id = community_post_supports.post_id
              AND ${postVisibilitySql('p')}
              AND ${activeRelationMembershipSql}
          )
      `).run(input);
    },

    getSupportState(input) {
      const row = database.prepare(`
        SELECT
          COUNT(ps.user_id) AS support_count,
          MAX(CASE WHEN ps.user_id = @userId THEN 1 ELSE 0 END) AS supported_by_me
        FROM community_posts p
        JOIN users relation_user ON relation_user.id = @userId
        JOIN companies relation_company ON relation_company.id = relation_user.company_id
        LEFT JOIN community_post_supports ps ON ps.post_id = p.id
        WHERE p.id = @postId
          AND ${postVisibilitySql('p')}
          AND ${activeRelationMembershipSql}
      `).get(input) as { support_count: number; supported_by_me: number | null };
      return { supportCount: row?.support_count ?? 0, supportedByMe: row?.supported_by_me === 1 };
    },

    addSave(input) {
      database.prepare(`
        INSERT OR IGNORE INTO community_post_saves (post_id, user_id, created_at)
        SELECT p.id, @userId, @now
        FROM community_posts p
        JOIN users relation_user ON relation_user.id = @userId
        JOIN companies relation_company ON relation_company.id = relation_user.company_id
        WHERE p.id = @postId
          AND ${postVisibilitySql('p')}
          AND ${activeRelationMembershipSql}
      `).run(input);
    },

    removeSave(input) {
      database.prepare(`
        DELETE FROM community_post_saves
        WHERE post_id = @postId
          AND user_id = @userId
          AND EXISTS (
            SELECT 1
            FROM community_posts p
            JOIN users relation_user ON relation_user.id = @userId
            JOIN companies relation_company ON relation_company.id = relation_user.company_id
            WHERE p.id = community_post_saves.post_id
              AND ${postVisibilitySql('p')}
              AND ${activeRelationMembershipSql}
          )
      `).run(input);
    },

    isSaved(input) {
      return Boolean(database.prepare(`
        SELECT 1
        FROM community_post_saves own_save
        JOIN community_posts p ON p.id = own_save.post_id
        JOIN users relation_user ON relation_user.id = @userId
        JOIN companies relation_company ON relation_company.id = relation_user.company_id
        WHERE own_save.post_id = @postId
          AND own_save.user_id = @userId
          AND ${postVisibilitySql('p')}
          AND ${activeRelationMembershipSql}
        LIMIT 1
      `).get(input));
    },

    listSupporters(input) {
      const supporterActive = activeUserConditions(userColumns, 'u');
      const now = input.now ?? new Date().toISOString();
      const cursorSql = input.cursor ? `AND (
        ps.created_at < @cursorCreatedAt
        OR (ps.created_at = @cursorCreatedAt AND ps.rowid < CAST(@cursorSupportRowId AS INTEGER))
      )` : '';
      const rows = database.prepare(`
        SELECT ps.rowid AS support_row_id, ps.created_at, u.name, u.nickname
        FROM community_post_supports ps
        JOIN community_posts p ON p.id = ps.post_id
        JOIN users u ON u.id = ps.user_id
        JOIN companies c ON c.id = u.company_id
        JOIN user_preferences pref
          ON pref.user_id = u.id
          AND pref.pref_key = 'privacy_community_supporter_name'
          AND pref.pref_value = '1'
        WHERE ps.post_id = @postId
          AND ${postVisibilitySql('p')}
          AND u.company_id = @companyId
          AND COALESCE(c.is_active, 0) = 1
          AND c.deleted_at IS NULL
          ${supporterActive.map((condition) => `AND ${condition}`).join('\n')}
          ${cursorSql}
        ORDER BY ps.created_at DESC, ps.rowid DESC
        LIMIT @fetchLimit
      `).all({
        postId: input.postId,
        companyId: input.companyId,
        now,
        fetchLimit: input.limit + 1,
        cursorCreatedAt: input.cursor?.[0] ?? null,
        cursorSupportRowId: input.cursor?.[1] ?? null,
      }) as SupporterRow[];
      const pageRows = rows.slice(0, input.limit);
      const last = pageRows.at(-1);
      return {
        names: pageRows.map((row) => {
          const nickname = row.nickname?.trim();
          return nickname || row.name.trim().split(/\s+/)[0];
        }),
        nextCursorTuple: rows.length > input.limit && last
          ? [last.created_at, String(last.support_row_id)]
          : null,
      };
    },
  };
}
