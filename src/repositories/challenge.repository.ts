import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  total_steps: number;
  deadline: string | null;
  archetype_id: string | null;
  created_at: string;
}

export function getChallengesByArchetype(archetypeId: string): ChallengeRow[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT * FROM challenges 
    WHERE archetype_id = ? OR archetype_id IS NULL
  `).all(archetypeId) as ChallengeRow[];
}

export interface UserChallengeRow extends ChallengeRow {
  progress: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export function getUserChallenges(userId: string, status?: string): UserChallengeRow[] {
  const db = getReadDb();
  if (status) {
    return db.prepare(`
      SELECT c.*, uc.progress, uc.status, uc.started_at, uc.completed_at
      FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      WHERE uc.user_id = ? AND uc.status = ?
      ORDER BY uc.started_at DESC
    `).all(userId, status) as UserChallengeRow[];
  }
  return db.prepare(`
    SELECT c.*, uc.progress, uc.status, uc.started_at, uc.completed_at
    FROM user_challenges uc
    JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = ?
    ORDER BY uc.started_at DESC
  `).all(userId) as UserChallengeRow[];
}

export function getUserChallenge(userId: string, challengeId: string): UserChallengeRow | undefined {
  const db = getReadDb();
  return db.prepare(`
    SELECT c.*, uc.progress, uc.status, uc.started_at, uc.completed_at
    FROM user_challenges uc
    JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = ? AND uc.challenge_id = ?
  `).get(userId, challengeId) as UserChallengeRow | undefined;
}

export function countCompletedChallenges(userId: string): number {
  const db = getReadDb();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM user_challenges WHERE user_id = ? AND status = 'completed'"
  ).get(userId) as { count: number };
  return row.count;
}

export async function updateUserChallenge(
  userId: string,
  challengeId: string,
  data: Partial<{
    progress: number;
    status: string;
    completedAt: string;
  }>
): Promise<UserChallengeRow> {
  const writeQueue = getWriteQueue();

  return writeQueue.enqueue((db) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.progress !== undefined) { fields.push('progress = ?'); values.push(data.progress); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(data.completedAt); }

    values.push(userId);
    values.push(challengeId);

    db.prepare(`UPDATE user_challenges SET ${fields.join(', ')} WHERE user_id = ? AND challenge_id = ?`).run(...values);

    return db.prepare(`
      SELECT c.*, uc.progress, uc.status, uc.started_at, uc.completed_at
      FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      WHERE uc.user_id = ? AND uc.challenge_id = ?
    `).get(userId, challengeId) as UserChallengeRow;
  });
}

export async function createUserChallenge(data: {
  userId: string;
  title: string;
  description: string;
  category: string;
  points: number;
  totalSteps: number;
  deadline?: string;
}): Promise<UserChallengeRow> {
  const writeQueue = getWriteQueue();
  const challengeId = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO challenges (id, title, description, category, points, total_steps, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(challengeId, data.title, data.description, data.category, data.points, data.totalSteps, data.deadline || null);

    db.prepare(`
      INSERT INTO user_challenges (user_id, challenge_id, progress, status)
      VALUES (?, ?, 0, 'active')
    `).run(data.userId, challengeId);

    return db.prepare(`
      SELECT c.*, uc.progress, uc.status, uc.started_at, uc.completed_at
      FROM user_challenges uc
      JOIN challenges c ON c.id = uc.challenge_id
      WHERE uc.user_id = ? AND uc.challenge_id = ?
    `).get(data.userId, challengeId) as UserChallengeRow;
  });
}
