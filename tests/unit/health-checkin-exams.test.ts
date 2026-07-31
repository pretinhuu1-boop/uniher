import { beforeEach, describe, expect, it, vi } from 'vitest';

const idState = vi.hoisted(() => ({ value: 0 }));
const deleteRun = vi.fn();
const insertExamRun = vi.fn();
const insertConsentRun = vi.fn();
const insertCaseRun = vi.fn();
const updateCaseRun = vi.fn();
const selectOpenCaseGet = vi.fn();
const selectLatestCaseGet = vi.fn();
const selectExamsAll = vi.fn();
const selectCurrentExamStateAll = vi.fn();
const selectBirthDateGet = vi.fn();
const updateBirthDateRun = vi.fn();
const transaction = vi.fn((callback: any) => () => callback());
const prepare = vi.fn((sql: string) => {
  if (sql.includes('DELETE FROM user_exams')) return { run: deleteRun };
  if (sql.includes('INSERT INTO user_exams')) return { run: insertExamRun };
  if (sql.includes('INSERT INTO user_consents')) return { run: insertConsentRun };
  if (sql.includes('UPDATE users')) return { run: updateBirthDateRun };
  if (sql.includes('SELECT birth_date') && sql.includes('FROM users')) {
    return { get: selectBirthDateGet };
  }
  if (sql.includes('SELECT due_date, status, not_applicable') && sql.includes('FROM user_exams')) {
    return { all: selectCurrentExamStateAll };
  }
  if (sql.includes('SELECT') && sql.includes('FROM user_exams')) return { all: selectExamsAll };
  if (sql.includes('SELECT') && sql.includes('FROM concierge_cases') && sql.includes("status IN ('open', 'in_progress')")) {
    return { get: selectOpenCaseGet };
  }
  if (sql.includes('SELECT') && sql.includes('FROM concierge_cases')) return { get: selectLatestCaseGet };
  if (sql.includes('INSERT INTO concierge_cases')) return { run: insertCaseRun };
  if (sql.includes('UPDATE concierge_cases')) return { run: updateCaseRun };
  throw new Error(`Unexpected SQL in test: ${sql}`);
});
const enqueue = vi.fn(async (callback: any) => callback({ prepare, transaction }));

vi.mock('@/lib/db', () => ({
  getReadDb: () => ({ prepare }),
  getWriteQueue: () => ({ enqueue }),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `exam-${++idState.value}`),
}));

import {
  ensureHealthSemaphoreConciergeCase,
  getHealthCheckinExams,
  recordHealthCheckinSubmission,
  syncHealthSemaphoreConciergeCase,
} from '@/repositories/health-checkin.repository';

describe('health check-in exam persistence', () => {
  beforeEach(() => {
    idState.value = 0;
    vi.clearAllMocks();
    updateBirthDateRun.mockReturnValue({ changes: 1 });
  });

  it('records consent, birth date, exams and Concierge escalation in one transaction', async () => {
    const result = await recordHealthCheckinSubmission({
      userId: 'user-1',
      companyId: 'company-1',
      birthDate: '1981-07-30',
      persistBirthDate: true,
      ipAddress: '203.0.113.10',
      userAgent: 'Playwright',
      overallStatus: 'urgent',
      examItems: [
        {
          examId: 'mammography',
          examName: 'Mamografia',
          status: 'overdue',
          priority: 'urgent',
          completedDate: '2024-06-15',
          dueDate: '2026-06-29',
        },
        {
          examId: 'papanicolau',
          examName: 'Papanicolau',
          status: 'overdue',
          priority: 'urgent',
          completedDate: '2023-06-15',
          dueDate: '2026-06-30',
        },
      ],
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(insertConsentRun).toHaveBeenCalledWith(
      'exam-1',
      'user-1',
      'semaforo-exams-v1',
      1,
      '203.0.113.10',
      'Playwright'
    );
    expect(updateBirthDateRun).toHaveBeenCalledWith('1981-07-30', 'user-1');
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM user_exams'));
    expect(deleteRun).toHaveBeenCalledWith('user-1', 'semaforo_exam_quiz');
    expect(prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO user_exams'));
    expect(insertExamRun).toHaveBeenCalledWith(
      'exam-2',
      'user-1',
      'mammography',
      'Mamografia',
      'overdue',
      '2024-06-15',
      '2026-06-29',
      'semaforo_exam_quiz',
      0,
      0
    );
    expect(insertExamRun).toHaveBeenCalledWith(
      'exam-3',
      'user-1',
      'papanicolau',
      'Papanicolau',
      'overdue',
      '2023-06-15',
      '2026-06-30',
      'semaforo_exam_quiz',
      0,
      0
    );
    expect(insertCaseRun).toHaveBeenCalledWith(
      'exam-4',
      'user-1',
      'company-1',
      'semaforo_exam_quiz',
      'urgent'
    );
    expect(result).toMatchObject({ id: 'exam-4', status: 'open', created: true });
  });

  it('aborts when another first submission already persisted a different birth date', async () => {
    updateBirthDateRun.mockReturnValue({ changes: 0 });
    selectBirthDateGet.mockReturnValue({ birth_date: '1980-01-01' });

    await expect(recordHealthCheckinSubmission({
      userId: 'user-1',
      companyId: 'company-1',
      birthDate: '1981-07-30',
      persistBirthDate: true,
      ipAddress: '203.0.113.10',
      userAgent: 'Playwright',
      overallStatus: 'safe',
      examItems: [],
    })).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });

    expect(insertConsentRun).not.toHaveBeenCalled();
    expect(deleteRun).not.toHaveBeenCalled();
    expect(insertExamRun).not.toHaveBeenCalled();
  });

  it('reads the saved dates back by stable exam key', () => {
    selectExamsAll.mockReturnValue([
      {
        exam_id: 'mammography',
        exam_name: 'Mamografia',
        status: 'overdue',
        completed_date: '2024-06-15',
        due_date: '2026-06-29',
      },
    ]);

    expect(getHealthCheckinExams('user-1')).toEqual([
      {
        examId: 'mammography',
        examName: 'Mamografia',
        status: 'overdue',
        completedDate: '2024-06-15',
        dueDate: '2026-06-29',
        unknown: false,
        notApplicable: false,
      },
    ]);
  });

  it('keeps one open Concierge case for repeated red results', async () => {
    selectOpenCaseGet
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({
        id: 'exam-1',
        status: 'open',
        severity: 'urgent',
      });

    const first = await syncHealthSemaphoreConciergeCase({
      userId: 'user-1',
      companyId: 'company-1',
      overallStatus: 'urgent',
    });
    const second = await syncHealthSemaphoreConciergeCase({
      userId: 'user-1',
      companyId: 'company-1',
      overallStatus: 'urgent',
    });

    expect(insertCaseRun).toHaveBeenCalledTimes(1);
    expect(insertCaseRun).toHaveBeenCalledWith(
      'exam-1',
      'user-1',
      'company-1',
      'semaforo_exam_quiz',
      'urgent'
    );
    expect(first).toMatchObject({ id: 'exam-1', status: 'open', created: true });
    expect(second).toMatchObject({ id: 'exam-1', status: 'open', created: false });
  });

  it('does not let a later self-reported non-red result close the Concierge case', async () => {
    selectOpenCaseGet.mockReturnValue({
      id: 'case-open-1',
      status: 'open',
      severity: 'urgent',
    });

    const result = await syncHealthSemaphoreConciergeCase({
      userId: 'user-1',
      companyId: 'company-1',
      overallStatus: 'safe',
    });

    expect(updateCaseRun).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'case-open-1',
      status: 'open',
      severity: 'urgent',
      created: false,
    });
  });

  it('rechecks current exam rows before lazily creating a red Concierge case', async () => {
    selectCurrentExamStateAll.mockReturnValue([
      {
        due_date: '2999-12-31',
        status: 'completed',
        not_applicable: 0,
      },
    ]);

    const result = await ensureHealthSemaphoreConciergeCase({
      userId: 'user-1',
      companyId: 'company-1',
    });

    expect(selectCurrentExamStateAll).toHaveBeenCalledWith('user-1', 'semaforo_exam_quiz');
    expect(insertCaseRun).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
