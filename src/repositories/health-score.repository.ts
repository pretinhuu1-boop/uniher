import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface HealthScoreRow {
  id: string;
  user_id: string;
  dimension: string;
  score: number;
  status: string;
  recorded_at: string;
}

export interface DimensionSummary {
  dimension: string;
  score: number;
  status: string;
  icon: string;
}

const DIMENSION_ICONS: Record<string, string> = {
  'Prevenção': '🏥',
  'Sono': '😴',
  'Energia': '⚡',
  'Saúde Mental': '🧠',
  'Hábitos': '🌱',
  'Engajamento': '🎯',
};

function scoreToStatus(score: number): string {
  if (score >= 7) return 'green';
  if (score >= 4) return 'yellow';
  return 'red';
}

export function getLatestHealthScores(userId: string): DimensionSummary[] {
  const db = getReadDb();
  // Pegar o score mais recente por dimensao
  const rows = db.prepare(`
    SELECT dimension, score, status
    FROM health_scores
    WHERE (user_id, dimension, recorded_at) IN (
      SELECT user_id, dimension, MAX(recorded_at)
      FROM health_scores
      WHERE user_id = ?
      GROUP BY dimension
    )
    ORDER BY dimension
  `).all(userId) as { dimension: string; score: number; status: string }[];

  return rows.map(r => ({
    dimension: r.dimension,
    score: r.score,
    status: r.status || scoreToStatus(r.score),
    icon: DIMENSION_ICONS[r.dimension] || '❤️',
  }));
}

export function getHealthScoreHistory(userId: string, dimension: string, days = 7): HealthScoreRow[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT * FROM health_scores
    WHERE user_id = ? AND dimension = ?
    AND recorded_at >= datetime('now', '-' || ? || ' days')
    ORDER BY recorded_at ASC
  `).all(userId, dimension, days) as HealthScoreRow[];
}

export function getCompanyHealthOverview(companyId: string): { dimension: string; avg_score: number; status: string }[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT
      hs.dimension,
      ROUND(AVG(hs.score), 1) as avg_score,
      CASE
        WHEN AVG(hs.score) >= 7 THEN 'green'
        WHEN AVG(hs.score) >= 4 THEN 'yellow'
        ELSE 'red'
      END as status
    FROM health_scores hs
    JOIN users u ON u.id = hs.user_id
    WHERE u.company_id = ?
    AND (hs.user_id, hs.dimension, hs.recorded_at) IN (
      SELECT user_id, dimension, MAX(recorded_at)
      FROM health_scores
      WHERE user_id IN (SELECT id FROM users WHERE company_id = ?)
      GROUP BY user_id, dimension
    )
    GROUP BY hs.dimension
  `).all(companyId, companyId) as { dimension: string; avg_score: number; status: string }[];
}

export async function recordHealthScore(
  userId: string,
  dimension: string,
  score: number
): Promise<HealthScoreRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();
  const status = scoreToStatus(score);

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO health_scores (id, user_id, dimension, score, status)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, dimension, score, status);

    return db.prepare('SELECT * FROM health_scores WHERE id = ?').get(id) as HealthScoreRow;
  });
}
