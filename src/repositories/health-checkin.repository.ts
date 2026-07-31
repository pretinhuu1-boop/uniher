import { getReadDb, getWriteQueue } from '@/lib/db';
import {
  classifyExamDueDate,
  type HealthCheckinStatus,
} from '@/lib/health-checkin/mapper';
import { ConflictError } from '@/lib/errors';
import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

const HEALTH_CHECKIN_EXAM_SOURCE = 'semaforo_exam_quiz';
const HEALTH_CHECKIN_CONSENT_TYPE = 'semaforo-exams-v1';

export interface HealthCheckinExamItem {
  examId: string;
  examName: string;
  status: 'completed' | 'pending' | 'overdue';
  priority?: HealthCheckinStatus;
  completedDate: string | null;
  dueDate: string | null;
  unknown?: boolean;
  notApplicable?: boolean;
}

export interface StoredHealthCheckinExam {
  examId: string;
  examName: string;
  status: 'completed' | 'pending' | 'overdue';
  completedDate: string | null;
  dueDate: string | null;
  unknown?: boolean;
  notApplicable?: boolean;
}

export interface HealthSemaphoreConciergeCase {
  id: string;
  status: 'open' | 'in_progress';
  severity: HealthCheckinStatus;
  created?: boolean;
}

export interface HealthCheckinSubmission {
  userId: string;
  companyId: string | null;
  birthDate: string;
  persistBirthDate: boolean;
  ipAddress: string;
  userAgent: string;
  overallStatus: HealthCheckinStatus;
  examItems: HealthCheckinExamItem[];
}

interface StoredExamRow {
  exam_id: string;
  exam_name: string;
  status: 'completed' | 'pending' | 'overdue';
  completed_date: string | null;
  due_date: string | null;
  unknown_due_date?: number;
  not_applicable?: number;
}

interface ConciergeCaseRow {
  id: string;
  status: 'open' | 'in_progress';
  severity: HealthCheckinStatus;
}

interface CurrentExamStateRow {
  due_date: string | null;
  status: 'completed' | 'pending' | 'overdue';
  not_applicable?: number;
}

export function getHealthCheckinExams(userId: string): StoredHealthCheckinExam[] {
  const db = getReadDb();
  const rows = db.prepare(`
    SELECT
      exam_key AS exam_id,
      exam_name,
      status,
      completed_date,
      due_date,
      unknown_due_date,
      not_applicable
    FROM user_exams
    WHERE user_id = ? AND source = ? AND exam_key IS NOT NULL
    ORDER BY created_at, exam_name
  `).all(userId, HEALTH_CHECKIN_EXAM_SOURCE) as StoredExamRow[];

  return rows.map((row) => ({
    examId: row.exam_id,
    examName: row.exam_name,
    status: row.status,
    completedDate: row.completed_date,
    dueDate: row.due_date,
    unknown: row.unknown_due_date === 1,
    notApplicable: row.not_applicable === 1,
  }));
}

function insertConsent(
  db: Database.Database,
  params: Pick<HealthCheckinSubmission, 'userId' | 'ipAddress' | 'userAgent'>
): void {
  db.prepare(`
    INSERT INTO user_consents (id, user_id, consent_type, granted, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    nanoid(),
    params.userId,
    HEALTH_CHECKIN_CONSENT_TYPE,
    1,
    params.ipAddress,
    params.userAgent
  );
}

function persistBirthDate(
  db: Database.Database,
  userId: string,
  birthDate: string
): void {
  const result = db.prepare(`
    UPDATE users
    SET birth_date = ?, updated_at = datetime('now')
    WHERE id = ? AND birth_date IS NULL
  `).run(birthDate, userId);
  if (result.changes > 0) return;

  const current = db.prepare(`
    SELECT birth_date
    FROM users
    WHERE id = ?
  `).get(userId) as { birth_date: string | null } | undefined;
  if (current?.birth_date !== birthDate) {
    throw new ConflictError(
      'A data de nascimento foi definida em outra sessao. Recarregue o Semaforo.'
    );
  }
}

function replaceExams(
  db: Database.Database,
  userId: string,
  examItems: HealthCheckinExamItem[]
): void {
  db.prepare(`
    DELETE FROM user_exams
    WHERE user_id = ? AND source = ?
  `).run(userId, HEALTH_CHECKIN_EXAM_SOURCE);

  const stmt = db.prepare(`
    INSERT INTO user_exams (
      id,
      user_id,
      exam_key,
      exam_name,
      status,
      completed_date,
      due_date,
      source,
      unknown_due_date,
      not_applicable
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of examItems) {
    stmt.run(
      nanoid(),
      userId,
      item.examId,
      item.examName,
      item.status,
      item.completedDate,
      item.dueDate,
      HEALTH_CHECKIN_EXAM_SOURCE,
      item.unknown ? 1 : 0,
      item.notApplicable ? 1 : 0
    );
  }
}

function syncConciergeCase(
  db: Database.Database,
  params: {
    userId: string;
    companyId: string | null;
    overallStatus: HealthCheckinStatus;
  }
): HealthSemaphoreConciergeCase | undefined {
  const existing = db.prepare(`
    SELECT id, status, severity
    FROM concierge_cases
    WHERE user_id = ?
      AND source = ?
      AND status IN ('open', 'in_progress')
    LIMIT 1
  `).get(params.userId, HEALTH_CHECKIN_EXAM_SOURCE) as ConciergeCaseRow | undefined;

  if (params.overallStatus !== 'urgent') {
    return existing ? { ...existing, created: false } : undefined;
  }

  if (existing) {
    db.prepare(`
      UPDATE concierge_cases
      SET severity = 'urgent', updated_at = datetime('now')
      WHERE id = ?
    `).run(existing.id);
    return { ...existing, severity: 'urgent', created: false };
  }

  const id = nanoid();
  db.prepare(`
    INSERT INTO concierge_cases (id, user_id, company_id, source, severity)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, params.userId, params.companyId, HEALTH_CHECKIN_EXAM_SOURCE, 'urgent');

  return {
    id,
    status: 'open',
    severity: 'urgent',
    created: true,
  };
}

export async function recordHealthCheckinSubmission(
  params: HealthCheckinSubmission
): Promise<HealthSemaphoreConciergeCase | undefined> {
  const writeQueue = getWriteQueue();

  return writeQueue.enqueue((db) => {
    const submit = db.transaction(() => {
      if (params.persistBirthDate) {
        persistBirthDate(db, params.userId, params.birthDate);
      }
      insertConsent(db, params);
      replaceExams(db, params.userId, params.examItems);
      return syncConciergeCase(db, params);
    });

    return submit();
  });
}

export function getHealthSemaphoreConciergeCase(
  userId: string
): HealthSemaphoreConciergeCase | undefined {
  const db = getReadDb();
  return db.prepare(`
    SELECT id, status, severity
    FROM concierge_cases
    WHERE user_id = ?
      AND source = ?
      AND status IN ('open', 'in_progress')
    ORDER BY opened_at DESC
    LIMIT 1
  `).get(userId, HEALTH_CHECKIN_EXAM_SOURCE) as HealthSemaphoreConciergeCase | undefined;
}

export async function syncHealthSemaphoreConciergeCase(params: {
  userId: string;
  companyId: string | null;
  overallStatus: HealthCheckinStatus;
}): Promise<HealthSemaphoreConciergeCase | undefined> {
  const writeQueue = getWriteQueue();
  return writeQueue.enqueue((db) => syncConciergeCase(db, params));
}

export async function ensureHealthSemaphoreConciergeCase(params: {
  userId: string;
  companyId: string | null;
}): Promise<HealthSemaphoreConciergeCase | undefined> {
  const writeQueue = getWriteQueue();

  return writeQueue.enqueue((db) => {
    const rows = db.prepare(`
      SELECT due_date, status, not_applicable
      FROM user_exams
      WHERE user_id = ? AND source = ?
    `).all(params.userId, HEALTH_CHECKIN_EXAM_SOURCE) as CurrentExamStateRow[];
    const hasUrgentExam = rows.some((row) => (
      row.not_applicable !== 1
      && (
        row.due_date
          ? classifyExamDueDate(row.due_date) === 'urgent'
          : row.status === 'overdue'
      )
    ));

    if (!hasUrgentExam) return undefined;
    return syncConciergeCase(db, { ...params, overallStatus: 'urgent' });
  });
}
