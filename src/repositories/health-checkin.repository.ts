import { getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

const HEALTH_CHECKIN_EXAM_SOURCE = 'semaforo_exam_quiz';
const HEALTH_CHECKIN_CONSENT_TYPE = 'semaforo-exams-v1';

export interface HealthCheckinExamItem {
  examName: string;
  status: string;
  priority: string;
}

export async function recordHealthCheckinExams(
  userId: string,
  examItems: HealthCheckinExamItem[]
): Promise<void> {
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    db.prepare(`
      DELETE FROM user_exams
      WHERE user_id = ? AND source = ?
    `).run(userId, HEALTH_CHECKIN_EXAM_SOURCE);

    const stmt = db.prepare(`
      INSERT INTO user_exams (id, user_id, exam_name, status, completed_date, due_date, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of examItems) {
      stmt.run(nanoid(), userId, item.examName, item.status, null, null, HEALTH_CHECKIN_EXAM_SOURCE);
    }
  });
}

export async function recordHealthCheckinConsent(params: {
  userId: string;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
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
  });
}
