import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { getReadDb } from '@/lib/db';

type FeedScope = 'company' | 'group';

interface FeedRow {
  id: string;
  type: 'mission' | 'badge_unlock';
  action: string;
  created_at: string;
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  meta: string | null;
}

interface FeedItem {
  id: string;
  type: 'mission' | 'badge_unlock';
  action: string;
  createdAt: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  icon: string;
  message: string;
  isSelf: boolean;
}

interface FeedSettings {
  companyFeedEnabled: boolean;
}

function buildMessage(row: FeedRow): { icon: string; message: string } {
  if (row.type === 'badge_unlock') {
    return { icon: '🏅', message: `desbloqueou o badge "${row.meta ?? 'Conquista'}"` };
  }

  if (row.action === 'share_badge') {
    return { icon: '📣', message: `compartilhou a conquista "${row.meta ?? 'Badge'}"` };
  }

  if (row.action === 'complete_challenge') {
    return { icon: '🎯', message: `avancou no desafio "${row.meta ?? 'Desafio'}"` };
  }

  if (row.action === 'check_in') {
    return { icon: '✅', message: 'fez check-in diario' };
  }

  return { icon: '✨', message: 'registrou uma nova atividade' };
}

export const GET = withAuth(async (req: NextRequest, { auth }) => {
  await initDb();
  const db = getReadDb();

  const scopeParam = (req.nextUrl.searchParams.get('scope') || 'company').toLowerCase();
  const scope: FeedScope = scopeParam === 'group' ? 'group' : 'company';
  const limitRaw = Number(req.nextUrl.searchParams.get('limit') || 20);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 5), 50) : 20;

  const me = db.prepare(
    'SELECT id, company_id, department_id FROM users WHERE id = ? LIMIT 1'
  ).get(auth.userId) as { id: string; company_id: string | null; department_id: string | null } | undefined;

  if (!me?.company_id) {
    return NextResponse.json({ items: [] as FeedItem[] });
  }

  const settingRow = db.prepare(
    'SELECT setting_value FROM company_settings WHERE company_id = ? AND setting_key = ? LIMIT 1'
  ).get(me.company_id, 'feed_company_enabled') as { setting_value?: string } | undefined;
  const companyFeedEnabled = settingRow ? settingRow.setting_value === '1' : true;

  const settings: FeedSettings = { companyFeedEnabled };

  const effectiveScope: FeedScope = (!companyFeedEnabled && scope === 'company') ? 'group' : scope;

  if (effectiveScope === 'group' && !me.department_id) {
    return NextResponse.json({ items: [] as FeedItem[], settings, scope: effectiveScope });
  }

  let scopeClause = 'u.company_id = ?';
  const scopeParams: (string | number)[] = [me.company_id];

  if (effectiveScope === 'group') {
    scopeClause += ' AND u.department_id = ?';
    scopeParams.push(me.department_id as string);
  }

  const query = `
    SELECT * FROM (
      SELECT
        ml.id AS id,
        'mission' AS type,
        ml.action AS action,
        COALESCE(ml.created_at, ml.day) AS created_at,
        u.id AS user_id,
        u.name AS user_name,
        u.avatar_url AS avatar_url,
        CASE
          WHEN ml.action = 'share_badge' THEN ml.note
          WHEN ml.action = 'complete_challenge' THEN c.title
          ELSE NULL
        END AS meta
      FROM mission_logs ml
      JOIN users u ON u.id = ml.user_id
      LEFT JOIN challenges c ON c.id = ml.challenge_id
      WHERE ${scopeClause}
        AND u.role != 'admin'
        AND ml.action IN ('share_badge', 'complete_challenge', 'check_in')

      UNION ALL

      SELECT
        ('badge-' || ub.user_id || '-' || ub.badge_id || '-' || ub.unlocked_at) AS id,
        'badge_unlock' AS type,
        'badge_unlock' AS action,
        ub.unlocked_at AS created_at,
        u.id AS user_id,
        u.name AS user_name,
        u.avatar_url AS avatar_url,
        b.name AS meta
      FROM user_badges ub
      JOIN users u ON u.id = ub.user_id
      JOIN badges b ON b.id = ub.badge_id
      WHERE ${scopeClause}
        AND u.role != 'admin'
    ) feed
    ORDER BY datetime(feed.created_at) DESC
    LIMIT ?
  `;

  const rows = db.prepare(query).all(...scopeParams, ...scopeParams, limit) as FeedRow[];
  const items: FeedItem[] = rows.map((row) => {
    const built = buildMessage(row);
    return {
      id: row.id,
      type: row.type,
      action: row.action,
      createdAt: row.created_at,
      userId: row.user_id,
      userName: row.user_name,
      avatarUrl: row.avatar_url,
      icon: built.icon,
      message: built.message,
      isSelf: row.user_id === auth.userId,
    };
  });

  return NextResponse.json({ items, settings, scope: effectiveScope });
});
