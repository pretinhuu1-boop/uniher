import { beforeEach, describe, expect, it, vi } from 'vitest';

const idState = vi.hoisted(() => ({ value: 0 }));
const deleteRun = vi.fn();
const insertRun = vi.fn();
const prepare = vi.fn((sql: string) => {
  if (sql.includes('DELETE FROM user_exams')) return { run: deleteRun };
  return { run: insertRun };
});
const enqueue = vi.fn(async (callback: any) => callback({ prepare }));

vi.mock('@/lib/db', () => ({
  getWriteQueue: () => ({ enqueue }),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `exam-${++idState.value}`),
}));

import { recordHealthCheckinExams } from '@/repositories/health-checkin.repository';
import { recordHealthCheckinConsent } from '@/repositories/health-checkin.repository';

describe('health check-in exam persistence', () => {
  beforeEach(() => {
    idState.value = 0;
    vi.clearAllMocks();
  });

  it('records exam quiz items in the collaborator private exam list', async () => {
    await recordHealthCheckinExams('user-1', [
      { examName: 'Mamografia', status: 'overdue', priority: 'urgent' },
      { examName: 'Papanicolau', status: 'overdue', priority: 'urgent' },
      { examName: 'Hemograma completo e ferritina', status: 'pending', priority: 'attention' },
    ]);

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM user_exams'));
    expect(deleteRun).toHaveBeenCalledWith('user-1', 'semaforo_exam_quiz');
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_exams'));
    expect(insertRun).toHaveBeenCalledWith('exam-1', 'user-1', 'Mamografia', 'overdue', null, null, 'semaforo_exam_quiz');
    expect(insertRun).toHaveBeenCalledWith('exam-2', 'user-1', 'Papanicolau', 'overdue', null, null, 'semaforo_exam_quiz');
    expect(insertRun).toHaveBeenCalledWith('exam-3', 'user-1', 'Hemograma completo e ferritina', 'pending', null, null, 'semaforo_exam_quiz');
  });

  it('records an auditable consent receipt for the health check-in quiz', async () => {
    await recordHealthCheckinConsent({
      userId: 'user-1',
      ipAddress: '203.0.113.10',
      userAgent: 'Playwright',
    });

    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_consents'));
    expect(insertRun).toHaveBeenCalledWith(
      'exam-1',
      'user-1',
      'semaforo-exams-v1',
      1,
      '203.0.113.10',
      'Playwright'
    );
  });
});
