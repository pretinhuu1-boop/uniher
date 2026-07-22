import { getReadDb, getWriteQueue } from '@/lib/db';
import { SAFE_MISSION_ACTIONS } from '@/lib/gamification/containment';
import { nanoid } from 'nanoid';

export type MissionAction = 'read_content';

export interface DailyMission {
  id: string;
  user_id: string;
  title: string;
  description: string;
  xp: number;
  category: string;
  action: MissionAction;
  day: string;
  completed: boolean;
  completed_at: string | null;
}

export interface MissionPayload {
  note?: string;
}

type MissionRow = Omit<DailyMission, 'completed'> & { completed: number };

function toSafeMission(row: MissionRow): DailyMission {
  return { ...row, xp: 0, completed: row.completed === 1 };
}

export async function ensureDailyMissions(userId: string): Promise<DailyMission[]> {
  const today = new Date().toISOString().split('T')[0];
  const db = getReadDb();
  const existing = db.prepare(`
    SELECT * FROM daily_missions
    WHERE user_id = ? AND day = ? AND action = 'read_content'
    ORDER BY created_at
  `).all(userId, today) as MissionRow[];
  if (existing.length > 0) return existing.map(toSafeMission);

  await getWriteQueue().enqueue((writeDb) => {
    const alreadyCreated = writeDb.prepare(`
      SELECT 1 FROM daily_missions
      WHERE user_id = ? AND day = ? AND action = 'read_content'
    `).get(userId, today);
    if (alreadyCreated) return;
    writeDb.prepare(`
      INSERT INTO daily_missions (id, user_id, title, description, xp, category, action, day)
      VALUES (?, ?, ?, ?, 0, ?, 'read_content', ?)
    `).run(
      nanoid(),
      userId,
      'Leitura de conteúdo',
      'Registre seu progresso em um conteúdo educativo.',
      'Educação',
      today,
    );
  });

  return (db.prepare(`
    SELECT * FROM daily_missions
    WHERE user_id = ? AND day = ? AND action = 'read_content'
    ORDER BY created_at
  `).all(userId, today) as MissionRow[]).map(toSafeMission);
}

export async function completeMission(
  userId: string,
  missionId: string,
  payload?: MissionPayload,
): Promise<{ success: boolean; progressRecorded: boolean }> {
  return getWriteQueue().enqueue((db) => {
    const mission = db.prepare(`
      SELECT id, action, completed FROM daily_missions
      WHERE id = ? AND user_id = ?
    `).get(missionId, userId) as { id: string; action: string; completed: number } | undefined;

    if (!mission || mission.completed === 1 || !SAFE_MISSION_ACTIONS.has(mission.action as MissionAction)) {
      return { success: false, progressRecorded: false };
    }

    db.prepare(`
      INSERT INTO mission_logs (id, user_id, mission_id, action, day, note)
      VALUES (?, ?, ?, 'read_content', ?, ?)
    `).run(
      nanoid(),
      userId,
      missionId,
      new Date().toISOString().split('T')[0],
      payload?.note?.trim() || null,
    );
    db.prepare(`
      UPDATE daily_missions
      SET completed = 1, completed_at = datetime('now')
      WHERE id = ? AND user_id = ? AND action = 'read_content'
    `).run(missionId, userId);

    return { success: true, progressRecorded: true };
  });
}

export function getDailyMissions(userId: string): DailyMission[] {
  const today = new Date().toISOString().split('T')[0];
  const db = getReadDb();
  return (db.prepare(`
    SELECT * FROM daily_missions
    WHERE user_id = ? AND day = ? AND action = 'read_content'
    ORDER BY created_at
  `).all(userId, today) as MissionRow[]).map(toSafeMission);
}
