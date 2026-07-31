import { describe, expect, it, vi } from 'vitest';
import {
  calculateAge,
  classifyExamDueDate,
  EXAM_CATALOG,
  getApplicableExams,
  mapHealthCheckinToSemaphore,
} from '@/lib/health-checkin/mapper';
import { healthCheckinSchema } from '@/lib/validation/schemas';

describe('exam-based health check-in mapper', () => {
  it('covers the preventive exam catalog and applies the age matrix from the UniHER source', () => {
    expect(EXAM_CATALOG.map((exam) => exam.id)).toEqual(expect.arrayContaining([
      'papanicolau',
      'colposcopy',
      'mammography',
      'pelvic_ultrasound',
      'clinical_breast_exam',
      'hormone_panel',
      'bone_density',
      'fertility_profile',
      'cbc_ferritin',
      'lipid_glucose',
      'vitamin_d',
      'serologies',
      'hpv_screening',
      'colonoscopy',
      'cognitive_assessment',
      'mental_health_screening',
    ]));

    expect(getApplicableExams(25).map((exam) => exam.id)).toContain('papanicolau');
    expect(getApplicableExams(25).map((exam) => exam.id)).not.toContain('mammography');
    expect(getApplicableExams(45).map((exam) => exam.id)).toContain('mammography');
    expect(getApplicableExams(45).map((exam) => exam.id)).not.toContain('colonoscopy');
    expect(getApplicableExams(55).map((exam) => exam.id)).toEqual(expect.arrayContaining([
      'mammography',
      'bone_density',
      'colonoscopy',
    ]));
    expect(getApplicableExams(70).map((exam) => exam.id)).toContain('cognitive_assessment');
  });

  it('derives age from birth date instead of trusting a typed age', () => {
    expect(calculateAge('1981-07-30', '2026-07-30')).toBe(45);
    expect(calculateAge('1981-07-31', '2026-07-30')).toBe(44);
  });

  it('classifies the exact preventive due-date boundaries', () => {
    const referenceDate = '2026-07-30';

    expect(classifyExamDueDate('2026-09-29', referenceDate)).toBe('safe');
    expect(classifyExamDueDate('2026-09-28', referenceDate)).toBe('attention');
    expect(classifyExamDueDate('2026-07-01', referenceDate)).toBe('attention');
    expect(classifyExamDueDate('2026-06-30', referenceDate)).toBe('urgent');
    expect(classifyExamDueDate(null, referenceDate)).toBe('attention');
  });

  it('maps only age-applicable dated exam answers to the preventive semaphore', () => {
    const result = mapHealthCheckinToSemaphore({
      birthDate: '1981-07-30',
      exams: {
        papanicolau: {
          completedDate: '2023-06-15',
          dueDate: '2026-06-30',
        },
        mammography: {
          completedDate: '2024-06-15',
          dueDate: '2026-06-29',
        },
        clinical_breast_exam: {
          completedDate: '2025-08-01',
          dueDate: '2026-08-01',
        },
        cbc_ferritin: {
          completedDate: '2026-01-15',
          dueDate: '2027-01-15',
        },
      },
    }, { conciergeEnabled: true, referenceDate: '2026-07-30' });

    expect(result.source).toBe('semaforo_exam_quiz_v1');
    expect(result.overallStatus).toBe('urgent');
    expect(result.nextAction).toBe('offer_concierge');
    expect(result.conciergeRequired).toBe(true);
    expect(result.counts).toEqual({
      green: 1,
      yellow: expect.any(Number),
      red: 2,
    });
    expect(result.examItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        examId: 'papanicolau',
        examName: 'Papanicolau',
        completedDate: '2023-06-15',
        dueDate: '2026-06-30',
        status: 'overdue',
        priority: 'urgent',
      }),
      expect.objectContaining({
        examName: 'Mamografia',
        dueDate: '2026-06-29',
        status: 'overdue',
        priority: 'urgent',
      }),
      expect.objectContaining({
        examName: 'Exame clinico das mamas',
        status: 'pending',
        priority: 'attention',
      }),
    ]));
  });

  it('does not include mammography before the age indicated by the matrix', () => {
    const result = mapHealthCheckinToSemaphore({
      birthDate: '2001-07-30',
      exams: {
        mammography: { dueDate: '2026-06-01' },
        papanicolau: { dueDate: '2027-01-01' },
      },
    }, { referenceDate: '2026-07-30' });

    expect(result.examItems).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ examName: 'Mamografia' }),
    ]));
  });

  it('does not allow required exams to be excluded as not applicable', () => {
    const result = mapHealthCheckinToSemaphore({
      birthDate: '1991-07-30',
      exams: {
        papanicolau: { notApplicable: true },
      },
    }, { referenceDate: '2026-07-30' });

    expect(result.examItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        examId: 'papanicolau',
        status: 'pending',
        priority: 'attention',
      }),
    ]));
  });

  it('preserves an overdue legacy result until the user supplies a real due date', () => {
    const result = mapHealthCheckinToSemaphore({
      birthDate: '1981-07-30',
      exams: {
        mammography: {
          dueDate: null,
          unknown: true,
          legacyStatus: 'overdue',
        },
      },
    }, { referenceDate: '2026-07-30' });

    expect(result.examItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        examId: 'mammography',
        status: 'overdue',
        priority: 'urgent',
      }),
    ]));
  });

  it('does not mark a completed legacy result as safe without a real due date', () => {
    const result = mapHealthCheckinToSemaphore({
      birthDate: '1981-07-30',
      exams: {
        mammography: {
          dueDate: null,
          unknown: true,
          legacyStatus: 'completed',
        },
      },
    }, { referenceDate: '2026-07-30' });

    expect(result.examItems).toEqual(expect.arrayContaining([
      expect.objectContaining({
        examId: 'mammography',
        status: 'pending',
        priority: 'attention',
      }),
    ]));
  });

  it('requires explicit consent before accepting exam quiz answers', () => {
    const payload = {
      source: 'semaforo_exam_quiz_v1',
      consent: {
        accepted: false,
        version: 'semaforo-exams-v1',
      },
      answers: {
        birthDate: '1991-07-30',
        exams: {
          papanicolau: {
            completedDate: '2025-01-15',
            dueDate: '2027-01-15',
          },
        },
      },
    };

    expect(() => healthCheckinSchema.parse(payload)).toThrow(/consent/i);
  });

  it('rejects empty, contradictory and chronologically invalid exam answers', () => {
    const payload = {
      source: 'semaforo_exam_quiz_v1' as const,
      consent: {
        accepted: true,
        version: 'semaforo-exams-v1' as const,
      },
      answers: {
        birthDate: '1991-07-30',
        exams: {},
      },
    };

    expect(() => healthCheckinSchema.parse(payload)).toThrow();
    expect(() => healthCheckinSchema.parse({
      ...payload,
      answers: {
        ...payload.answers,
        exams: {
          papanicolau: {
            unknown: true,
            dueDate: '2027-01-15',
          },
        },
      },
    })).toThrow();
    expect(() => healthCheckinSchema.parse({
      ...payload,
      answers: {
        ...payload.answers,
        exams: {
          papanicolau: {
            completedDate: '2025-01-15',
            dueDate: '2024-01-15',
          },
        },
      },
    })).toThrow();
    expect(() => healthCheckinSchema.parse({
      ...payload,
      answers: {
        ...payload.answers,
        exams: {
          papanicolau: {
            completedDate: '2999-01-15',
            dueDate: '2999-02-15',
          },
        },
      },
    })).toThrow();
  });

  it('uses the Sao Paulo calendar day when rejecting future completed dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T02:30:00.000Z'));

    try {
      expect(() => healthCheckinSchema.parse({
        source: 'semaforo_exam_quiz_v1',
        consent: {
          accepted: true,
          version: 'semaforo-exams-v1',
        },
        answers: {
          birthDate: '1991-07-30',
          exams: {
            papanicolau: {
              completedDate: '2026-07-31',
              dueDate: '2027-07-31',
            },
          },
        },
      })).toThrow();
    } finally {
      vi.useRealTimers();
    }
  });
});
