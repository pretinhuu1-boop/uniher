import { getReadDb, getWriteQueue } from '@/lib/db';
import { runAsActiveCompanyActor } from '@/lib/security/active-rh-actor';
import { nanoid } from 'nanoid';

export interface CampaignRow {
  id: string;
  name: string;
  month: string;
  color: string;
  status: string;
  status_label: string | null;
  company_id: string | null;
  start_date: string | null;
  end_date: string | null;
  theme: string | null;
  theme_color: string | null;
  created_at: string;
}

export interface UserCampaignRow extends CampaignRow {
  progress: number;
  joined: boolean;
}

export function getCampaignsByCompany(companyId: string): CampaignRow[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT * FROM campaigns
    WHERE company_id = ? OR company_id IS NULL
    ORDER BY created_at ASC
  `).all(companyId) as CampaignRow[];
}

export function getUserCampaigns(userId: string, companyId: string): UserCampaignRow[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT
      c.*,
      COALESCE(uc.progress, 0) as progress,
      CASE WHEN uc.user_id IS NOT NULL THEN 1 ELSE 0 END as joined
    FROM campaigns c
    LEFT JOIN user_campaigns uc ON uc.campaign_id = c.id AND uc.user_id = ?
    WHERE c.company_id = ? OR c.company_id IS NULL
    ORDER BY c.created_at ASC
  `).all(userId, companyId) as UserCampaignRow[];
}

export function countActiveCampaigns(companyId: string): number {
  const db = getReadDb();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM campaigns WHERE (company_id = ? OR company_id IS NULL) AND status = 'active'"
  ).get(companyId) as { count: number };
  return row.count;
}

export type JoinCampaignResult =
  | { status: 'actor_inactive' }
  | { status: 'campaign_unavailable' }
  | { status: 'already_joined' }
  | {
      status: 'joined';
      pointsEarned: number;
      newStreak: number;
      badgeUnlocked?: string;
      levelUp: boolean;
    };

export async function joinCampaign(
  userId: string,
  companyId: string,
  campaignId: string,
): Promise<JoinCampaignResult> {
  const activityId = nanoid();
  const badgeNotificationId = nanoid();
  const levelNotificationId = nanoid();

  const outcome = await getWriteQueue().enqueue((db) => runAsActiveCompanyActor(
    db,
    userId,
    companyId,
    ['admin', 'rh', 'lideranca', 'colaboradora'],
    () => {
      const campaign = db.prepare(`
        SELECT id
        FROM campaigns
        WHERE id = ?
          AND status = 'active'
          AND (company_id = ? OR company_id IS NULL)
      `).get(campaignId, companyId);

      if (!campaign) {
        return { status: 'campaign_unavailable' } as const;
      }

      const inserted = db.prepare(`
        INSERT OR IGNORE INTO user_campaigns (user_id, campaign_id, progress)
        VALUES (?, ?, 0)
      `).run(userId, campaignId);

      if (inserted.changes === 0) {
        return { status: 'already_joined' } as const;
      }

      const user = db.prepare(`
        SELECT points, streak
        FROM users
        WHERE id = ? AND company_id = ?
      `).get(userId, companyId) as { points: number; streak: number };
      const latestActivity = db.prepare(`
        SELECT date(created_at) AS date
        FROM activity_log
        WHERE user_id = ? AND action != 'login'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(userId) as { date: string } | undefined;

      let newStreak = user.streak;
      if (!latestActivity) {
        newStreak = 1;
      } else {
        const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
        const last = new Date(`${latestActivity.date}T00:00:00Z`);
        const diffDays = Math.ceil((today.getTime() - last.getTime()) / 86_400_000);
        if (diffDays === 1) newStreak += 1;
        if (diffDays > 1) newStreak = 1;
      }

      const pointsEarned = 100;
      const newPoints = user.points + pointsEarned;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO activity_log (
          id, user_id, action, target_type, target_id, points_earned
        )
        VALUES (?, ?, 'join_campaign', 'campaign', ?, ?)
      `).run(activityId, userId, campaignId, pointsEarned);
      db.prepare(`
        UPDATE users
        SET points = ?, streak = ?, last_active = ?, updated_at = datetime('now')
        WHERE id = ? AND company_id = ?
      `).run(newPoints, newStreak, now, userId, companyId);

      let badgeUnlocked: string | undefined;
      if (newStreak === 7) {
        const badgeExists = db.prepare(
          "SELECT id FROM badges WHERE id = 'badge_2'",
        ).get();
        if (badgeExists) {
          const unlocked = db.prepare(`
            INSERT OR IGNORE INTO user_badges (user_id, badge_id)
            VALUES (?, 'badge_2')
          `).run(userId);
          if (unlocked.changes === 1) {
            badgeUnlocked = 'Badge de Streak de 7 dias!';
            db.prepare(`
              INSERT INTO notifications (id, user_id, type, title, message)
              VALUES (?, ?, 'badge', ?, ?)
            `).run(
              badgeNotificationId,
              userId,
              'Sequencia de 7 dias!',
              'Voce acaba de desbloquear o badge de assiduidade de uma semana!',
            );
          }
        }
      }

      const levelUp = Math.floor(newPoints / 1000) > Math.floor(user.points / 1000);
      if (levelUp) {
        db.prepare(`
          INSERT INTO notifications (id, user_id, type, title, message)
          VALUES (?, ?, 'level', ?, ?)
        `).run(
          levelNotificationId,
          userId,
          'Subiu de Nivel!',
          'Parabens! Voce alcancou novos horizontes na sua jornada de saude.',
        );
      }

      return {
        status: 'joined',
        pointsEarned,
        newStreak,
        badgeUnlocked,
        levelUp,
      } as const;
    },
  ), 'join campaign and award points', { retryOnFailure: false });

  return outcome.authorized ? outcome.value : { status: 'actor_inactive' };
}

export async function createCampaign(data: {
  name: string;
  month: string;
  color: string;
  status: string;
  statusLabel?: string;
  companyId: string;
  start_date?: string;
  end_date?: string;
  theme?: string;
  theme_color?: string;
}): Promise<CampaignRow> {
  const writeQueue = getWriteQueue();
  const id = `camp_${Math.random().toString(36).slice(2, 9)}`;

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO campaigns (id, name, month, color, status, status_label, company_id, start_date, end_date, theme, theme_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.month, data.color, data.status,
      data.statusLabel || 'Próxima', data.companyId,
      data.start_date || null, data.end_date || null,
      data.theme || null, data.theme_color || null
    );

    return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as CampaignRow;
  });
}
