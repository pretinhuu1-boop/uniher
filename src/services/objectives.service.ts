import { objectiveRepo, CreateObjectiveData } from '@/repositories/objective.repository';
import { getDb } from '@/lib/db';
import { writeQueue } from '@/lib/db/write-queue';

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
  payload?: { campaignId?: string; amount?: number }
): Promise<void> {
  await writeQueue.enqueue(async () => {
    const objectives = objectiveRepo.getByCompany(companyId);
    const db = getDb();
    const weekKey = currentWeekKey();

    for (const obj of objectives) {
      if (obj.target_type !== triggerType) continue;

      // Campaign-type: only trigger for the linked campaign
      if (obj.type === 'campaign' && obj.campaign_id && payload?.campaignId !== obj.campaign_id) continue;

      let currentValue = 0;

      // Determine current real value from DB
      if (triggerType === 'points') {
        const user = db.prepare(`SELECT points FROM users WHERE id = ?`).get(userId) as { points: number } | undefined;
        currentValue = user?.points ?? 0;
        if (obj.type === 'weekly') {
          // Count points earned this week from activity_log
          const res = db.prepare(`
            SELECT COALESCE(SUM(points), 0) as total
            FROM activity_log
            WHERE user_id = ? AND created_at >= date('now', 'weekday 0', '-7 days')
          `).get(userId) as { total: number };
          currentValue = res.total;
        }
      } else if (triggerType === 'missions') {
        const res = db.prepare(`
          SELECT COUNT(*) as total FROM mission_logs
          WHERE user_id = ?
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
        const res = db.prepare(`
          SELECT COUNT(*) as total FROM user_challenges
          WHERE user_id = ? AND status = 'completed'
        `).get(userId) as { total: number };
        currentValue = res.total;
      } else if (triggerType === 'campaign_join' || triggerType === 'campaign_complete') {
        currentValue = 1; // binary: done or not
      }

      const completed = currentValue >= obj.target_value;
      const wk = obj.type === 'weekly' ? weekKey : null;
      objectiveRepo.upsertProgress(userId, obj.id, currentValue, completed, wk);
    }
  });
}

export async function createObjective(data: CreateObjectiveData) {
  return writeQueue.enqueue(async () => objectiveRepo.create(data));
}

export async function claimObjectiveReward(
  userId: string,
  companyId: string,
  objectiveId: string,
  weekKey?: string
): Promise<{ ok: boolean; reward_type?: string; reward_points?: number; reward_custom?: string; reward_badge_name?: string }> {
  return writeQueue.enqueue(async () => {
    const obj = objectiveRepo.getById(objectiveId);
    if (!obj || obj.company_id !== companyId) return { ok: false };

    const claimed = objectiveRepo.claimReward(userId, objectiveId, weekKey ?? null);
    if (!claimed) return { ok: false };

    // Apply points reward
    if (obj.reward_type === 'points' && obj.reward_points > 0) {
      const db = getDb();
      db.prepare(`UPDATE users SET points = points + ? WHERE id = ?`).run(obj.reward_points, userId);
      db.prepare(`
        INSERT INTO activity_log (id, user_id, action, points, created_at)
        VALUES (?, ?, 'objective_reward', ?, datetime('now'))
      `).run(crypto.randomUUID(), userId, obj.reward_points);
    }

    // Apply badge reward
    if (obj.reward_type === 'badge' && obj.reward_badge_id) {
      const db = getDb();
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
