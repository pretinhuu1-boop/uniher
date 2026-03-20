import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export type MissionAction =
  | 'check_in'
  | 'complete_challenge'
  | 'drink_water'
  | 'read_content'
  | 'update_semaforo'
  | 'share_badge';

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

const MISSION_POOL: Omit<DailyMission, 'id' | 'user_id' | 'day' | 'completed' | 'completed_at'>[] = [
  { title: 'Check-in Diário', description: 'Faça seu check-in para manter a sequência', xp: 50, category: 'Rotina', action: 'check_in' },
  { title: 'Complete um Desafio', description: 'Avance em qualquer desafio ativo', xp: 40, category: 'Desafios', action: 'complete_challenge' },
  { title: 'Hidratação', description: 'Registre que bebeu água hoje', xp: 20, category: 'Saúde', action: 'drink_water' },
  { title: 'Leitura de Conteúdo', description: 'Leia um artigo de saúde feminina', xp: 30, category: 'Educação', action: 'read_content' },
  { title: 'Atualizar Semáforo', description: 'Atualize seu semáforo de saúde', xp: 35, category: 'Saúde', action: 'update_semaforo' },
  { title: 'Compartilhar Badge', description: 'Compartilhe uma conquista desbloqueada', xp: 25, category: 'Social', action: 'share_badge' },
];

/** Pick 3 missions for the day, seeded by user+date for consistency */
function pickMissions(userId: string, day: string) {
  const seed = userId.charCodeAt(0) + new Date(day).getDate();
  const shuffled = [...MISSION_POOL].sort((a, b) => {
    const ha = (a.action.charCodeAt(0) + seed) % 100;
    const hb = (b.action.charCodeAt(0) + seed) % 100;
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

export async function ensureDailyMissions(userId: string): Promise<DailyMission[]> {
  const today = new Date().toISOString().split('T')[0];
  const db = getReadDb();
  const existing = db.prepare('SELECT * FROM daily_missions WHERE user_id = ? AND day = ?').all(userId, today) as any[];

  if (existing.length >= 3) {
    return existing.map(m => ({ ...m, completed: m.completed === 1 }));
  }

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    const alreadyCreated = db.prepare('SELECT COUNT(*) as c FROM daily_missions WHERE user_id = ? AND day = ?').get(userId, today) as { c: number };
    if (alreadyCreated.c >= 3) return;

    const missions = pickMissions(userId, today);
    for (const m of missions) {
      db.prepare('INSERT INTO daily_missions (id, user_id, title, description, xp, category, action, day) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(nanoid(), userId, m.title, m.description, m.xp, m.category, m.action, today);
    }
  });

  const fresh = db.prepare('SELECT * FROM daily_missions WHERE user_id = ? AND day = ?').all(userId, today) as any[];
  return fresh.map(m => ({ ...m, completed: m.completed === 1 }));
}

export interface MissionPayload {
  mood?: string;        // check_in: 'tired' | 'ok' | 'good' | 'great'
  glasses?: number;     // drink_water: 1-8
  challengeId?: string; // complete_challenge: challenge id to advance
  note?: string;        // optional note for any mission
}

export async function completeMission(userId: string, missionId: string, payload?: MissionPayload): Promise<{
  success: boolean; xpEarned: number; allCompleted: boolean;
}> {
  const wq = getWriteQueue();
  return wq.enqueue((db) => {
    const mission = db.prepare('SELECT * FROM daily_missions WHERE id = ? AND user_id = ?').get(missionId, userId) as any;
    if (!mission) return { success: false, xpEarned: 0, allCompleted: false };
    if (mission.completed) return { success: false, xpEarned: 0, allCompleted: false };

    // Save mission log with payload data
    try {
      db.prepare(`
        INSERT INTO mission_logs (id, user_id, mission_id, action, day, mood, glasses, challenge_id, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        nanoid(), userId, missionId, mission.action,
        new Date().toISOString().split('T')[0],
        payload?.mood ?? null,
        payload?.glasses ?? null,
        payload?.challengeId ?? null,
        payload?.note ?? null,
      );
    } catch { /* table may not exist yet during migration */ }

    // For complete_challenge: advance the chosen challenge
    if (mission.action === 'complete_challenge' && payload?.challengeId) {
      try {
        const uc = db.prepare(`SELECT * FROM user_challenges WHERE user_id = ? AND challenge_id = ?`).get(userId, payload.challengeId) as any;
        if (uc && uc.status === 'active') {
          const ch = db.prepare(`SELECT total_steps FROM challenges WHERE id = ?`).get(payload.challengeId) as any;
          const newProgress = Math.min((uc.progress ?? 0) + 1, ch?.total_steps ?? 999);
          const newStatus = newProgress >= (ch?.total_steps ?? 999) ? 'completed' : 'active';
          db.prepare(`UPDATE user_challenges SET progress = ?, status = ?, updated_at = datetime('now') WHERE user_id = ? AND challenge_id = ?`)
            .run(newProgress, newStatus, userId, payload.challengeId);
        }
      } catch { /* noop */ }
    }

    db.prepare(`UPDATE daily_missions SET completed = 1, completed_at = datetime('now') WHERE id = ?`).run(missionId);

    // Award XP
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (user) {
      const today = new Date().toISOString().split('T')[0];
      const dailyEarned = user.daily_xp_date === today ? (user.daily_xp_earned || 0) : 0;
      const newPoints = user.points + mission.xp;
      const newDailyEarned = dailyEarned + mission.xp;

      // Import-free inline level calc to avoid circular deps
      let level = 1, accumulated = 0;
      const xpPerLevel = (l: number) => l * 500;
      while (accumulated + xpPerLevel(level) <= newPoints) { accumulated += xpPerLevel(level); level++; }

      db.prepare(`UPDATE users SET points = ?, level = ?, daily_xp_earned = ?, daily_xp_date = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(newPoints, level, newDailyEarned, today, userId);
    }

    const today = new Date().toISOString().split('T')[0];
    const remaining = db.prepare('SELECT COUNT(*) as c FROM daily_missions WHERE user_id = ? AND day = ? AND completed = 0').get(userId, today) as { c: number };
    const allCompleted = remaining.c === 0;

    if (allCompleted) {
      // Bonus notification
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'badge', ?, ?)`)
        .run(nanoid(), userId, '🎯 Missões Diárias Completas!', 'Você completou todas as missões de hoje. Incrível!');
    }

    return { success: true, xpEarned: mission.xp, allCompleted };
  });
}

export function getDailyMissions(userId: string): DailyMission[] {
  const today = new Date().toISOString().split('T')[0];
  const db = getReadDb();
  const rows = db.prepare('SELECT * FROM daily_missions WHERE user_id = ? AND day = ? ORDER BY created_at').all(userId, today) as any[];
  return rows.map(m => ({ ...m, completed: m.completed === 1 }));
}
