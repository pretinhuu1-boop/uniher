import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { AppError, RateLimitError } from '@/lib/errors';
import { LEGACY_GAMIFICATION_NOTIFICATION_TYPES } from '@/lib/gamification/containment';

export const DSAR_EXPORT_WINDOW_MS = 60 * 60 * 1000;
export const DSAR_EXPORT_BATCH_SIZE = 64;

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

type DsarRow = Record<string, unknown>;
type RowIdCursor = number | bigint;
type TimestampCursor = { timestamp: string; id: string };

function stripInternalCursorFields(row: DsarRow): DsarRow {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !key.startsWith('__dsar_cursor_')),
  );
}

function getRowIdCursor(row: DsarRow): RowIdCursor {
  const cursor = row.__dsar_cursor_rowid;
  if (typeof cursor !== 'number' && typeof cursor !== 'bigint') {
    throw new Error('DSAR row is missing its rowid cursor');
  }
  return cursor;
}

function getTimestampCursor(row: DsarRow): TimestampCursor {
  const timestamp = row.__dsar_cursor_timestamp;
  const id = row.__dsar_cursor_id;
  if (typeof timestamp !== 'string' || typeof id !== 'string') {
    throw new Error('DSAR row is missing its timestamp cursor');
  }
  return { timestamp, id };
}

function materializePage(rows: IterableIterator<DsarRow>): DsarRow[] {
  return Array.from(rows);
}

function* streamPaginatedJsonArray<Cursor>(
  loadPage: (cursor: Cursor | null) => DsarRow[],
  readCursor: (row: DsarRow) => Cursor,
): Generator<string, void, unknown> {
  let first = true;
  let cursor: Cursor | null = null;
  let page = loadPage(cursor);

  yield '[';
  while (true) {
    for (const row of page) {
      yield `${first ? '' : ','}${serializeJson(stripInternalCursorFields(row))}`;
      first = false;
    }

    if (page.length < DSAR_EXPORT_BATCH_SIZE) break;
    cursor = readCursor(page[page.length - 1]);
    page = loadPage(cursor);
  }
  yield ']';
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
  yield* streamPaginatedJsonArray<RowIdCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT id, archetype_id, answers_json, created_at,
                 rowid AS __dsar_cursor_rowid
          FROM quiz_results
          WHERE user_id = ?
          ORDER BY rowid ASC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT id, archetype_id, answers_json, created_at,
                 rowid AS __dsar_cursor_rowid
          FROM quiz_results
          WHERE user_id = ? AND rowid > ?
          ORDER BY rowid ASC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getRowIdCursor);

  yield ',"notifications":';
  yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT id, type, title, message, read, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM notifications
          WHERE user_id = ? AND type NOT IN (${legacyTypePlaceholders})
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT id, type, title, message, read, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM notifications
          WHERE user_id = ? AND type NOT IN (${legacyTypePlaceholders})
            AND (COALESCE(created_at, ''), id) < (?, ?)
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, ...legacyTypes, DSAR_EXPORT_BATCH_SIZE]
      : [userId, ...legacyTypes, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getTimestampCursor);

  const legacyUserGamification = db.prepare(
    'SELECT points, level, league FROM users WHERE id = ?',
  ).get(userId);
  yield `,"legacyDerivedData":{"label":${serializeJson('Derivado legado — em revisão')},"userGamification":${serializeJson(legacyUserGamification)},"badges":`;
  yield* streamPaginatedJsonArray<RowIdCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT ub.badge_id, b.name, b.description, ub.unlocked_at,
                 ub.rowid AS __dsar_cursor_rowid
          FROM user_badges ub
          LEFT JOIN badges b ON b.id = ub.badge_id
          WHERE ub.user_id = ?
          ORDER BY ub.rowid ASC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT ub.badge_id, b.name, b.description, ub.unlocked_at,
                 ub.rowid AS __dsar_cursor_rowid
          FROM user_badges ub
          LEFT JOIN badges b ON b.id = ub.badge_id
          WHERE ub.user_id = ? AND ub.rowid > ?
          ORDER BY ub.rowid ASC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getRowIdCursor);

  yield ',"healthScores":';
  yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT dimension, score, recorded_at,
                 id AS __dsar_cursor_id,
                 COALESCE(recorded_at, '') AS __dsar_cursor_timestamp
          FROM health_scores
          WHERE user_id = ?
          ORDER BY COALESCE(recorded_at, '') DESC, id DESC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT dimension, score, recorded_at,
                 id AS __dsar_cursor_id,
                 COALESCE(recorded_at, '') AS __dsar_cursor_timestamp
          FROM health_scores
          WHERE user_id = ?
            AND (COALESCE(recorded_at, ''), id) < (?, ?)
          ORDER BY COALESCE(recorded_at, '') DESC, id DESC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getTimestampCursor);

  yield ',"challenges":';
  yield* streamPaginatedJsonArray<RowIdCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT uc.challenge_id, c.title, uc.progress, uc.status, uc.started_at, uc.completed_at,
                 uc.rowid AS __dsar_cursor_rowid
          FROM user_challenges uc
          LEFT JOIN challenges c ON c.id = uc.challenge_id
          WHERE uc.user_id = ?
          ORDER BY uc.rowid ASC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT uc.challenge_id, c.title, uc.progress, uc.status, uc.started_at, uc.completed_at,
                 uc.rowid AS __dsar_cursor_rowid
          FROM user_challenges uc
          LEFT JOIN challenges c ON c.id = uc.challenge_id
          WHERE uc.user_id = ? AND uc.rowid > ?
          ORDER BY uc.rowid ASC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getRowIdCursor);

  yield ',"activityLog":';
  yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT id, action, target_type, target_id, points_earned, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM activity_log
          WHERE user_id = ?
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT id, action, target_type, target_id, points_earned, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM activity_log
          WHERE user_id = ?
            AND (COALESCE(created_at, ''), id) < (?, ?)
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getTimestampCursor);

  yield ',"missionLogs":';
  yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT id, mission_id, action, day, mood, glasses, challenge_id, note, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM mission_logs
          WHERE user_id = ?
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT id, mission_id, action, day, mood, glasses, challenge_id, note, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM mission_logs
          WHERE user_id = ?
            AND (COALESCE(created_at, ''), id) < (?, ?)
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getTimestampCursor);

  yield ',"notifications":';
  yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT id, type, title, message, read, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM notifications
          WHERE user_id = ? AND type IN (${legacyTypePlaceholders})
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT id, type, title, message, read, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(created_at, '') AS __dsar_cursor_timestamp
          FROM notifications
          WHERE user_id = ? AND type IN (${legacyTypePlaceholders})
            AND (COALESCE(created_at, ''), id) < (?, ?)
          ORDER BY COALESCE(created_at, '') DESC, id DESC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, ...legacyTypes, DSAR_EXPORT_BATCH_SIZE]
      : [userId, ...legacyTypes, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getTimestampCursor);
  yield '}}';
}
