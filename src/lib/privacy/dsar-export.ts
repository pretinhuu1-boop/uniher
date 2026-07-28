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
type StableIdCursor = string;
type TimestampCursor = { timestamp: string; id: string };

function stripInternalCursorFields(row: DsarRow): DsarRow {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !key.startsWith('__dsar_cursor_')),
  );
}

function getStableIdCursor(row: DsarRow): StableIdCursor {
  const cursor = row.__dsar_cursor_id;
  if (typeof cursor !== 'string') {
    throw new Error('DSAR row is missing its stable id cursor');
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

function tableExists(db: Database.Database, table: string): boolean {
  const row = db.prepare(`
    SELECT 1 AS exists_flag
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
    LIMIT 1
  `).get(table) as { exists_flag: number } | undefined;
  return row !== undefined;
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

  yield `{"exportedAt":${serializeJson(exportedAt)},"user":${serializeJson(user)},"employeeIdentityProfile":`;
  const employeeIdentityProfile = tableExists(db, 'employee_identity_profiles')
    ? db.prepare(`
        SELECT id, company_id, full_name, mother_name, cpf_last4,
               rg_last4, rg_issuer, birth_date, sex, marital_status,
               health_plan, cep, street_type, street, number, complement,
               neighborhood, city, uf, email, ddd, phone, source,
               created_at, updated_at
        FROM employee_identity_profiles
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY updated_at DESC, id DESC
        LIMIT 1
      `).get(userId)
    : null;
  yield serializeJson(employeeIdentityProfile ?? null);
  yield ',"quizResults":';
  yield* streamPaginatedJsonArray<StableIdCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT id, archetype_id, answers_json, created_at,
                 id AS __dsar_cursor_id
          FROM quiz_results
          WHERE user_id = ?
          ORDER BY id ASC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT id, archetype_id, answers_json, created_at,
                 id AS __dsar_cursor_id
          FROM quiz_results
          WHERE user_id = ? AND id > ?
          ORDER BY id ASC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getStableIdCursor);

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
  yield* streamPaginatedJsonArray<StableIdCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT ub.badge_id, b.name, b.description, ub.unlocked_at,
                 ub.badge_id AS __dsar_cursor_id
          FROM user_badges ub
          LEFT JOIN badges b ON b.id = ub.badge_id
          WHERE ub.user_id = ?
          ORDER BY ub.badge_id ASC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT ub.badge_id, b.name, b.description, ub.unlocked_at,
                 ub.badge_id AS __dsar_cursor_id
          FROM user_badges ub
          LEFT JOIN badges b ON b.id = ub.badge_id
          WHERE ub.user_id = ? AND ub.badge_id > ?
          ORDER BY ub.badge_id ASC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getStableIdCursor);

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
  yield* streamPaginatedJsonArray<StableIdCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT uc.challenge_id, c.title, uc.progress, uc.status, uc.started_at, uc.completed_at,
                 uc.challenge_id AS __dsar_cursor_id
          FROM user_challenges uc
          LEFT JOIN challenges c ON c.id = uc.challenge_id
          WHERE uc.user_id = ?
          ORDER BY uc.challenge_id ASC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT uc.challenge_id, c.title, uc.progress, uc.status, uc.started_at, uc.completed_at,
                 uc.challenge_id AS __dsar_cursor_id
          FROM user_challenges uc
          LEFT JOIN challenges c ON c.id = uc.challenge_id
          WHERE uc.user_id = ? AND uc.challenge_id > ?
          ORDER BY uc.challenge_id ASC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getStableIdCursor);

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

  yield '},"wellbeingEvents":';
  if (!tableExists(db, 'wellbeing_events')) {
    yield '[]';
  } else {
    yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
      const statement = cursor === null
        ? db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, event_type, mood, day, created_at, updated_at,
                   id AS __dsar_cursor_id,
                   COALESCE(created_at, '') AS __dsar_cursor_timestamp
            FROM wellbeing_events
            WHERE user_id = ?
            ORDER BY COALESCE(created_at, '') DESC, id DESC
            LIMIT ?
          `)
        : db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, event_type, mood, day, created_at, updated_at,
                   id AS __dsar_cursor_id,
                   COALESCE(created_at, '') AS __dsar_cursor_timestamp
            FROM wellbeing_events
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
  }

  yield ',"personalSemaforo":';
  if (!tableExists(db, 'personal_semaforo_entries')) {
    yield '{"consent":null,"entries":[]}';
  } else {
    const consent = tableExists(db, 'personal_semaforo_consents')
      ? db.prepare(`
          SELECT consent_version, accepted_at, revoked_at, retention_days, updated_at
          FROM personal_semaforo_consents
          WHERE user_id = ?
        `).get(userId)
      : null;
    yield `{"consent":${serializeJson(consent)},"entries":`;
    yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
      const statement = cursor === null
        ? db.prepare<unknown[], DsarRow>(`
            SELECT id, dimension, signal, energy, note, consent_version, created_at, expires_at,
                   id AS __dsar_cursor_id,
                   COALESCE(created_at, '') AS __dsar_cursor_timestamp
            FROM personal_semaforo_entries
            WHERE user_id = ? AND deleted_at IS NULL
            ORDER BY COALESCE(created_at, '') DESC, id DESC
            LIMIT ?
          `)
        : db.prepare<unknown[], DsarRow>(`
            SELECT id, dimension, signal, energy, note, consent_version, created_at, expires_at,
                   id AS __dsar_cursor_id,
                   COALESCE(created_at, '') AS __dsar_cursor_timestamp
            FROM personal_semaforo_entries
            WHERE user_id = ? AND deleted_at IS NULL
              AND (COALESCE(created_at, ''), id) < (?, ?)
            ORDER BY COALESCE(created_at, '') DESC, id DESC
            LIMIT ?
          `);
      const params = cursor === null
        ? [userId, DSAR_EXPORT_BATCH_SIZE]
        : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
      return materializePage(statement.iterate(...params));
    }, getTimestampCursor);
    yield '}';
  }

  yield ',"personalObjectives":';
  if (!tableExists(db, 'personal_objectives')) {
    yield '[]';
  } else {
    yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
      const statement = cursor === null
        ? db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, user_id, template_key, status, progress,
                   created_at, updated_at, completed_at, archived_at,
                   id AS __dsar_cursor_id,
                   COALESCE(updated_at, '') AS __dsar_cursor_timestamp
            FROM personal_objectives
            WHERE user_id = ?
            ORDER BY COALESCE(updated_at, '') DESC, id DESC
            LIMIT ?
          `)
        : db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, user_id, template_key, status, progress,
                   created_at, updated_at, completed_at, archived_at,
                   id AS __dsar_cursor_id,
                   COALESCE(updated_at, '') AS __dsar_cursor_timestamp
            FROM personal_objectives
            WHERE user_id = ?
              AND (COALESCE(updated_at, ''), id) < (?, ?)
            ORDER BY COALESCE(updated_at, '') DESC, id DESC
            LIMIT ?
          `);
      const params = cursor === null
        ? [userId, DSAR_EXPORT_BATCH_SIZE]
        : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
      return materializePage(statement.iterate(...params));
    }, getTimestampCursor);
  }

  yield ',"companyChallenges":';
  if (!tableExists(db, 'user_company_challenges')) {
    yield '[]';
  } else {
    yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
      const statement = cursor === null
        ? db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, user_id, catalog_key, status, progress,
                   joined_at, updated_at, completed_at, left_at,
                   id AS __dsar_cursor_id,
                   COALESCE(updated_at, '') AS __dsar_cursor_timestamp
            FROM user_company_challenges
            WHERE user_id = ?
            ORDER BY COALESCE(updated_at, '') DESC, id DESC
            LIMIT ?
          `)
        : db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, user_id, catalog_key, status, progress,
                   joined_at, updated_at, completed_at, left_at,
                   id AS __dsar_cursor_id,
                   COALESCE(updated_at, '') AS __dsar_cursor_timestamp
            FROM user_company_challenges
            WHERE user_id = ?
              AND (COALESCE(updated_at, ''), id) < (?, ?)
            ORDER BY COALESCE(updated_at, '') DESC, id DESC
            LIMIT ?
          `);
      const params = cursor === null
        ? [userId, DSAR_EXPORT_BATCH_SIZE]
        : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
      return materializePage(statement.iterate(...params));
    }, getTimestampCursor);
  }

  yield ',"privateAchievements":';
  if (!tableExists(db, 'private_achievements')) {
    yield '[]';
  } else {
    yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
      const statement = cursor === null
        ? db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, user_id, achievement_key, status, progress,
                   earned_event_id, created_at, updated_at, earned_at, revoked_at,
                   id AS __dsar_cursor_id,
                   COALESCE(updated_at, '') AS __dsar_cursor_timestamp
            FROM private_achievements
            WHERE user_id = ?
            ORDER BY COALESCE(updated_at, '') DESC, id DESC
            LIMIT ?
          `)
        : db.prepare<unknown[], DsarRow>(`
            SELECT id, company_id, user_id, achievement_key, status, progress,
                   earned_event_id, created_at, updated_at, earned_at, revoked_at,
                   id AS __dsar_cursor_id,
                   COALESCE(updated_at, '') AS __dsar_cursor_timestamp
            FROM private_achievements
            WHERE user_id = ?
              AND (COALESCE(updated_at, ''), id) < (?, ?)
            ORDER BY COALESCE(updated_at, '') DESC, id DESC
            LIMIT ?
          `);
      const params = cursor === null
        ? [userId, DSAR_EXPORT_BATCH_SIZE]
        : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
      return materializePage(statement.iterate(...params));
    }, getTimestampCursor);
  }

  const participationTablesExist = tableExists(db, 'eligible_participation_events')
    && tableExists(db, 'eligible_participation_event_revocations');
  if (!participationTablesExist) {
    yield ',"eligibleParticipation":{"events":[],"revocations":[]}}';
    return;
  }

  yield ',"eligibleParticipation":{"events":';
  yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT id, event_key, mutation_id, company_id, user_id, event_type,
                 source_domain, source_id, eligibility_version, metadata_json,
                 occurred_at, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(occurred_at, '') AS __dsar_cursor_timestamp
          FROM eligible_participation_events
          WHERE user_id = ?
          ORDER BY COALESCE(occurred_at, '') DESC, id DESC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT id, event_key, mutation_id, company_id, user_id, event_type,
                 source_domain, source_id, eligibility_version, metadata_json,
                 occurred_at, created_at,
                 id AS __dsar_cursor_id,
                 COALESCE(occurred_at, '') AS __dsar_cursor_timestamp
          FROM eligible_participation_events
          WHERE user_id = ?
            AND (COALESCE(occurred_at, ''), id) < (?, ?)
          ORDER BY COALESCE(occurred_at, '') DESC, id DESC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getTimestampCursor);

  yield ',"revocations":';
  yield* streamPaginatedJsonArray<TimestampCursor>((cursor) => {
    const statement = cursor === null
      ? db.prepare<unknown[], DsarRow>(`
          SELECT r.id, r.event_id, r.company_id, r.reason_code, r.actor_id,
                 r.version, r.revoked_at,
                 r.id AS __dsar_cursor_id,
                 COALESCE(r.revoked_at, '') AS __dsar_cursor_timestamp
          FROM eligible_participation_event_revocations r
          JOIN eligible_participation_events e ON e.id = r.event_id
          WHERE e.user_id = ?
          ORDER BY COALESCE(r.revoked_at, '') DESC, r.id DESC
          LIMIT ?
        `)
      : db.prepare<unknown[], DsarRow>(`
          SELECT r.id, r.event_id, r.company_id, r.reason_code, r.actor_id,
                 r.version, r.revoked_at,
                 r.id AS __dsar_cursor_id,
                 COALESCE(r.revoked_at, '') AS __dsar_cursor_timestamp
          FROM eligible_participation_event_revocations r
          JOIN eligible_participation_events e ON e.id = r.event_id
          WHERE e.user_id = ?
            AND (COALESCE(r.revoked_at, ''), r.id) < (?, ?)
          ORDER BY COALESCE(r.revoked_at, '') DESC, r.id DESC
          LIMIT ?
        `);
    const params = cursor === null
      ? [userId, DSAR_EXPORT_BATCH_SIZE]
      : [userId, cursor.timestamp, cursor.id, DSAR_EXPORT_BATCH_SIZE];
    return materializePage(statement.iterate(...params));
  }, getTimestampCursor);
  yield '}}';
}
