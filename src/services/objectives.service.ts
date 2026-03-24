import { objectiveRepo, CreateObjectiveData } from '@/repositories/objective.repository';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

function currentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, '0')}`;
}

/** After a user completes an action, update objectives progress automatically */
export async function updateObjectivesProgress(
  userId: string,
  companyId: string,
  triggerType: 'points' | 'missions' | 'level' | 'streak' | 'challenges' | 'campaign_join' | 'campaign_complete',
  payload?: { campaignId?: string }
): Promise<void> {
  const wq = getWriteQueue();
  wq.enqueue((db) => {
    const objectives = objectiveRepo.getByCompany(companyId);
    const weekKey = currentWeekKey();

    for (const obj of objectives) {
      if (obj.target_type !== triggerType) continue;
      if (obj.type === 'campaign' && obj.campaign_id && payload?.campaignId !== obj.campaign_id) continue;

      let currentValue = 0;

      if (triggerType === 'points') {
        if (obj.type === 'weekly') {
          const res = db.prepare(`
            SELECT COALESCE(SUM(points), 0) as total FROM activity_log
            WHERE user_id = ? AND created_at >= date('now', 'weekday 0', '-7 days')
          `).get(userId) as { total: number };
          currentValue = res.total;
        } else {
          const user = db.prepare(`SELECT points FROM users WHERE id = ?`).get(userId) as { points: number } | undefined;
          currentValue = user?.points ?? 0;
        }
      } else if (triggerType === 'missions') {
        const res = db.prepare(`
          SELECT COUNT(*) as total FROM mission_logs WHERE user_id = ?
          ${obj.type === 'weekly' ? "AND created_at >= date('now', 'weekday 0', '-7 days')" : ''}
        `).get(userId) as { total: number };
        currentValue = res.total;
      } else if (triggerType === 'level') {
        const user = db.prepare(`SELECT level FROM users WHERE id = ?`).get(userId) as { level: number } | undefined;
        currentValue = user?.level ?? 0;
      } else if (triggerType === 'streak') {
        const user = db.prepare(`SELECT streak FROM users WHERE id = ?`).get(userId) as { streak: number } | undefined;
        currentValue = user?.streak ?? 0;
      } else if (triggerType === 'challenges') {
        const res = db.prepare(`SELECT COUNT(*) as total FROM user_challenges WHERE user_id = ? AND status = 'completed'`).get(userId) as { total: number };
        currentValue = res.total;
      } else if (triggerType === 'campaign_join' || triggerType === 'campaign_complete') {
        currentValue = 1;
      }

      const completed = currentValue >= obj.target_value;
      const wk = obj.type === 'weekly' ? weekKey : null;
      const id = nanoid();
      db.prepare(`
        INSERT INTO user_objective_progress (id, user_id, objective_id, current_value, completed, completed_at, week_key)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, objective_id, week_key) DO UPDATE SET
          current_value = excluded.current_value,
          completed = excluded.completed,
          completed_at = CASE WHEN excluded.completed = 1 AND user_objective_progress.completed = 0 THEN datetime('now') ELSE user_objective_progress.completed_at END
      `).run(id, userId, obj.id, currentValue, completed ? 1 : 0, completed ? new Date().toISOString() : null, wk);
    }
  });
}

export async function createObjective(data: CreateObjectiveData) {
  return getWriteQueue().enqueue(() => objectiveRepo.create(data));
}

export function claimObjectiveReward(
  userId: string,
  companyId: string,
  objectiveId: string,
  weekKey?: string
): Promise<{ ok: boolean; reward_type?: string; reward_points?: number; reward_custom?: string; reward_badge_name?: string }> {
  return getWriteQueue().enqueue((db) => {
    const obj = objectiveRepo.getById(objectiveId);
    if (!obj || obj.company_id !== companyId) return { ok: false };

    const result = db.prepare(`
      UPDATE user_objective_progress
      SET reward_claimed = 1, reward_claimed_at = datetime('now')
      WHERE user_id = ? AND objective_id = ?
        AND (? IS NULL OR week_key = ?)
        AND completed = 1 AND reward_claimed = 0
    `).run(userId, objectiveId, weekKey ?? null, weekKey ?? null);

    if (result.changes === 0) return { ok: false };

    if (obj.reward_type === 'points' && obj.reward_points > 0) {
      db.prepare(`UPDATE users SET points = points + ? WHERE id = ?`).run(obj.reward_points, userId);
      db.prepare(`
        INSERT INTO activity_log (id, user_id, action, points, created_at)
        VALUES (?, ?, 'objective_reward', ?, datetime('now'))
      `).run(nanoid(), userId, obj.reward_points);
    }

    if (obj.reward_type === 'badge' && obj.reward_badge_id) {
      db.prepare(`
        INSERT OR IGNORE INTO user_badges (user_id, badge_id, unlocked_at)
        VALUES (?, ?, datetime('now'))
      `).run(userId, obj.reward_badge_id);
    }

    return {
      ok: true,
      reward_type: obj.reward_type,
      reward_points: obj.reward_points,
      reward_custom: obj.reward_custom ?? undefined,
      reward_badge_name: obj.reward_badge_name,
    };
  });
}
