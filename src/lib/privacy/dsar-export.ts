import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { AppError, RateLimitError } from '@/lib/errors';
import { LEGACY_GAMIFICATION_NOTIFICATION_TYPES } from '@/lib/gamification/containment';

export const DSAR_EXPORT_WINDOW_MS = 60 * 60 * 1000;

export type DsarExportReservation = {
  token: string;
  nextAllowedAt: number;
};

export type DsarExportOutcome = 'completed' | 'failed' | 'cancelled';

type SqliteError = Error & { code?: string };

function isSqliteContention(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { code, message } = error as SqliteError;
  return code === 'SQLITE_BUSY'
    || code === 'SQLITE_LOCKED'
    || /database is (?:busy|locked)/i.test(message);
}

function runImmediate<T>(transaction: { immediate(): T }): T {
  try {
    return transaction.immediate();
  } catch (error) {
    if (isSqliteContention(error)) {
      throw new AppError(
        'Serviço de exportação temporariamente indisponível. Tente novamente.',
        503,
        'DATABASE_BUSY',
      );
    }
    throw error;
  }
}

export function reserveDsarExportWindow(
  db: Database.Database,
  userId: string,
  now = Date.now(),
): DsarExportReservation {
  const token = randomUUID();
  const nextAllowedAt = now + DSAR_EXPORT_WINDOW_MS;
  const reserve = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO dsar_export_cooldowns (
        user_id, next_allowed_at, updated_at, reservation_token, status
      ) VALUES (?, ?, ?, ?, 'in_progress')
      ON CONFLICT(user_id) DO UPDATE SET
        next_allowed_at = excluded.next_allowed_at,
        updated_at = excluded.updated_at,
        reservation_token = excluded.reservation_token,
        status = 'in_progress'
      WHERE dsar_export_cooldowns.next_allowed_at <= ?
         OR dsar_export_cooldowns.status = 'failed'
    `).run(userId, nextAllowedAt, new Date(now).toISOString(), token, now);

    if (result.changes !== 1) {
      throw new RateLimitError('Você já exportou seus dados recentemente. Tente novamente em 1 hora.');
    }
    return { token, nextAllowedAt };
  });

  return runImmediate(reserve);
}

export function finishDsarExportReservation(
  db: Database.Database,
  userId: string,
  token: string,
  outcome: DsarExportOutcome,
  now = Date.now(),
): boolean {
  const finish = db.transaction(() => {
    const result = db.prepare(`
      UPDATE dsar_export_cooldowns
      SET status = ?,
          next_allowed_at = CASE WHEN ? = 'failed' THEN 0 ELSE next_allowed_at END,
          updated_at = ?
      WHERE user_id = ?
        AND reservation_token = ?
        AND status = 'in_progress'
    `).run(outcome, outcome, new Date(now).toISOString(), userId, token);
    return result.changes === 1;
  });

  return runImmediate(finish);
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value) ?? 'null';
}

function* streamJsonArray(rows: IterableIterator<unknown>): Generator<string, void, unknown> {
  let first = true;
  let exhausted = false;
  try {
    yield '[';
    while (true) {
      const result = rows.next();
      if (result.done) {
        exhausted = true;
        break;
      }
      yield `${first ? '' : ','}${serializeJson(result.value)}`;
      first = false;
    }
    yield ']';
  } finally {
    if (!exhausted) rows.return?.();
  }
}

export function* createDsarExportJsonChunks(
  db: Database.Database,
  userId: string,
  exportedAt: string,
): Generator<string, void, unknown> {
  const legacyTypes = [...LEGACY_GAMIFICATION_NOTIFICATION_TYPES];
  const legacyTypePlaceholders = legacyTypes.map(() => '?').join(', ');
  const user = db.prepare(
    'SELECT id, name, email, role, department_id, company_id, avatar_url, created_at, updated_at FROM users WHERE id = ?',
  ).get(userId);

  yield `{"exportedAt":${serializeJson(exportedAt)},"user":${serializeJson(user)},"quizResults":`;
  yield* streamJsonArray(db.prepare(
    'SELECT id, archetype_id, answers_json, created_at FROM quiz_results WHERE user_id = ?',
  ).iterate(userId));

  yield ',"notifications":';
  yield* streamJsonArray(db.prepare(`
    SELECT id, type, title, message, read, created_at
    FROM notifications
    WHERE user_id = ? AND type NOT IN (${legacyTypePlaceholders})
    ORDER BY created_at DESC
  `).iterate(userId, ...legacyTypes));

  const legacyUserGamification = db.prepare(
    'SELECT points, level, league FROM users WHERE id = ?',
  ).get(userId);
  yield `,"legacyDerivedData":{"label":${serializeJson('Derivado legado — em revisão')},"userGamification":${serializeJson(legacyUserGamification)},"badges":`;
  yield* streamJsonArray(db.prepare(`
    SELECT ub.badge_id, b.name, b.description, ub.unlocked_at
    FROM user_badges ub
    LEFT JOIN badges b ON b.id = ub.badge_id
    WHERE ub.user_id = ?
  `).iterate(userId));

  yield ',"healthScores":';
  yield* streamJsonArray(db.prepare(
    'SELECT dimension, score, recorded_at FROM health_scores WHERE user_id = ? ORDER BY recorded_at DESC',
  ).iterate(userId));

  yield ',"challenges":';
  yield* streamJsonArray(db.prepare(`
    SELECT uc.challenge_id, c.title, uc.progress, uc.status, uc.started_at, uc.completed_at
    FROM user_challenges uc
    LEFT JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = ?
  `).iterate(userId));

  yield ',"activityLog":';
  yield* streamJsonArray(db.prepare(`
    SELECT id, action, target_type, target_id, points_earned, created_at
    FROM activity_log
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).iterate(userId));

  yield ',"missionLogs":';
  yield* streamJsonArray(db.prepare(`
    SELECT id, mission_id, action, day, mood, glasses, challenge_id, note, created_at
    FROM mission_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).iterate(userId));

  yield ',"notifications":';
  yield* streamJsonArray(db.prepare(`
    SELECT id, type, title, message, read, created_at
    FROM notifications
    WHERE user_id = ? AND type IN (${legacyTypePlaceholders})
    ORDER BY created_at DESC
  `).iterate(userId, ...legacyTypes));
  yield '}}';
}
