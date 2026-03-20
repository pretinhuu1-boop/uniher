import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface QuizResultRow {
  id: string;
  user_id: string;
  archetype_id: string | null;
  answers_json: string;
  created_at: string;
}

export interface ArchetypeRow {
  id: string;
  key: string;
  name: string;
  description: string;
  base_scores: string;
  growth_30: string;
  growth_60: string;
  growth_90: string;
  missions: number;
  campaigns: number;
  habits: number;
}

export function getQuizResult(userId: string): QuizResultRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM quiz_results WHERE user_id = ?').get(userId) as QuizResultRow | undefined;
}

export function getArchetypeByKey(key: string): ArchetypeRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM archetypes WHERE key = ?').get(key) as ArchetypeRow | undefined;
}

export async function saveQuizResult(data: {
  userId: string;
  archetypeKey: string;
  answers: unknown[];
}): Promise<QuizResultRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    const archetype = db.prepare('SELECT id FROM archetypes WHERE key = ?').get(data.archetypeKey) as { id: string } | undefined;

    // Upsert: um usuario so tem um resultado
    db.prepare(`
      INSERT INTO quiz_results (id, user_id, archetype_id, answers_json)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        archetype_id = excluded.archetype_id,
        answers_json = excluded.answers_json
    `).run(id, data.userId, archetype?.id || null, JSON.stringify(data.answers));

    return db.prepare('SELECT * FROM quiz_results WHERE user_id = ?').get(data.userId) as QuizResultRow;
  });
}
