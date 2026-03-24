import { getReadDb as getDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface Objective {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  type: 'weekly' | 'goal' | 'campaign';
  target_type: string;
  target_value: number;
  campaign_id: string | null;
  campaign_name?: string;
  reward_type: 'points' | 'badge' | 'custom';
  reward_points: number;
  reward_badge_id: string | null;
  reward_badge_name?: string;
  reward_custom: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: number;
  created_by: string | null;
  created_at: string;
  // progress fields (when queried for a user)
  current_value?: number;
  completed?: number;
  reward_claimed?: number;
  week_key?: string;
  progress_id?: string;
}

export interface CreateObjectiveData {
  company_id: string;
  title: string;
  description?: string;
  type: 'weekly' | 'goal' | 'campaign';
  target_type: string;
  target_value: number;
  campaign_id?: string;
  reward_type: 'points' | 'badge' | 'custom';
  reward_points?: number;
  reward_badge_id?: string;
  reward_custom?: string;
  starts_at?: string;
  ends_at?: string;
  created_by: string;
}

function currentWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-${String(week).padStart(2, '0')}`;
}

export const objectiveRepo = {
  getByCompany(companyId: string): Objective[] {
    const db = getDb();
    return db.prepare(`
      SELECT o.*, c.name as campaign_name, b.name as reward_badge_name
      FROM company_objectives o
      LEFT JOIN campaigns c ON c.id = o.campaign_id
      LEFT JOIN badges b ON b.id = o.reward_badge_id
      WHERE o.company_id = ? AND o.is_active = 1
      ORDER BY o.created_at DESC
    `).all(companyId) as Objective[];
  },

  getByCompanyWithProgress(companyId: string, userId: string): Objective[] {
    const db = getDb();
    const weekKey = currentWeekKey();
    return db.prepare(`
      SELECT
        o.*,
        c.name as campaign_name,
        b.name as reward_badge_name,
        COALESCE(p.current_value, 0) as current_value,
        COALESCE(p.completed, 0) as completed,
        COALESCE(p.reward_claimed, 0) as reward_claimed,
        p.week_key,
        p.id as progress_id
      FROM company_objectives o
      LEFT JOIN campaigns c ON c.id = o.campaign_id
      LEFT JOIN badges b ON b.id = o.reward_badge_id
      LEFT JOIN user_objective_progress p
        ON p.objective_id = o.id
        AND p.user_id = ?
        AND (o.type != 'weekly' OR p.week_key = ?)
      WHERE o.company_id = ? AND o.is_active = 1
        AND (o.starts_at IS NULL OR o.starts_at <= datetime('now'))
        AND (o.ends_at IS NULL OR o.ends_at >= datetime('now'))
      ORDER BY o.created_at DESC
    `).all(userId, weekKey, companyId) as Objective[];
  },

  getById(id: string): Objective | undefined {
    const db = getDb();
    return db.prepare(`
      SELECT o.*, c.name as campaign_name, b.name as reward_badge_name
      FROM company_objectives o
      LEFT JOIN campaigns c ON c.id = o.campaign_id
      LEFT JOIN badges b ON b.id = o.reward_badge_id
      WHERE o.id = ?
    `).get(id) as Objective | undefined;
  },

  create(data: CreateObjectiveData): Objective {
    const db = getDb();
    const id = nanoid();
    db.prepare(`
      INSERT INTO company_objectives
        (id, company_id, title, description, type, target_type, target_value,
         campaign_id, reward_type, reward_points, reward_badge_id, reward_custom,
         starts_at, ends_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.company_id, data.title, data.description ?? null,
      data.type, data.target_type, data.target_value,
      data.campaign_id ?? null,
      data.reward_type, data.reward_points ?? 0,
      data.reward_badge_id ?? null, data.reward_custom ?? null,
      data.starts_at ?? null, data.ends_at ?? null, data.created_by
    );
    return this.getById(id)!;
  },

  update(id: string, data: Partial<CreateObjectiveData & { is_active: number }>): void {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];
    const allowed = [
      'title', 'description', 'type', 'target_type', 'target_value',
      'campaign_id', 'reward_type', 'reward_points', 'reward_badge_id',
      'reward_custom', 'starts_at', 'ends_at', 'is_active'
    ] as const;
    for (const key of allowed) {
      if (key in data) {
        fields.push(`${key} = ?`);
        values.push((data as Record<string, unknown>)[key] ?? null);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    db.prepare(`UPDATE company_objectives SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  delete(id: string): void {
    const db = getDb();
    db.prepare(`UPDATE company_objectives SET is_active = 0 WHERE id = ?`).run(id);
  },

  getProgress(userId: string, objectiveId: string, weekKey?: string): { current_value: number; completed: number; reward_claimed: number; id: string } | undefined {
    const db = getDb();
    if (weekKey) {
      return db.prepare(`SELECT * FROM user_objective_progress WHERE user_id = ? AND objective_id = ? AND week_key = ?`).get(userId, objectiveId, weekKey) as { current_value: number; completed: number; reward_claimed: number; id: string } | undefined;
    }
    return db.prepare(`SELECT * FROM user_objective_progress WHERE user_id = ? AND objective_id = ? AND week_key IS NULL`).get(userId, objectiveId) as { current_value: number; completed: number; reward_claimed: number; id: string } | undefined;
  },

  upsertProgress(userId: string, objectiveId: string, currentValue: number, completed: boolean, weekKey?: string | null): void {
    const db = getDb();
    const id = nanoid();
    db.prepare(`
      INSERT INTO user_objective_progress (id, user_id, objective_id, current_value, completed, completed_at, week_key)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, objective_id, week_key) DO UPDATE SET
        current_value = excluded.current_value,
        completed = excluded.completed,
        completed_at = CASE WHEN excluded.completed = 1 AND user_objective_progress.completed = 0 THEN datetime('now') ELSE user_objective_progress.completed_at END
    `).run(id, userId, objectiveId, currentValue, completed ? 1 : 0, completed ? new Date().toISOString() : null, weekKey ?? null);
  },

  claimReward(userId: string, objectiveId: string, weekKey?: string | null): boolean {
    const db = getDb();
    const result = db.prepare(`
      UPDATE user_objective_progress
      SET reward_claimed = 1, reward_claimed_at = datetime('now')
      WHERE user_id = ? AND objective_id = ?
        AND (? IS NULL OR week_key = ?)
        AND completed = 1 AND reward_claimed = 0
    `).run(userId, objectiveId, weekKey ?? null, weekKey ?? null);
    return result.changes > 0;
  },
};
