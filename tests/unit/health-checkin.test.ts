import { describe, expect, it } from 'vitest';
import {
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

  it('maps only age-applicable exam answers to the preventive semaphore', () => {
    const result = mapHealthCheckinToSemaphore({
      age: 45,
      exams: {
        papanicolau: 'overdue',
        mammography: 'overdue',
        clinical_breast_exam: 'due_soon',
        cbc_ferritin: 'in_day',
      },
    }, { conciergeEnabled: true });

    expect(result.source).toBe('semaforo_exam_quiz_v1');
    expect(result.overallStatus).toBe('urgent');
    expect(result.nextAction).toBe('offer_concierge');
    expect(result.createConciergeCase).toBe(false);
    expect(result.counts).toEqual({
      green: 1,
      yellow: expect.any(Number),
      red: 2,
    });
    expect(result.examItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ examName: 'Papanicolau', status: 'overdue', priority: 'urgent' }),
      expect.objectContaining({ examName: 'Mamografia', status: 'overdue', priority: 'urgent' }),
      expect.objectContaining({ examName: 'Exame clinico das mamas', status: 'pending', priority: 'attention' }),
    ]));
  });

  it('does not include mammography before the age indicated by the matrix', () => {
    const result = mapHealthCheckinToSemaphore({
      age: 25,
      exams: {
        mammography: 'overdue',
        papanicolau: 'in_day',
      },
    });

    expect(result.examItems).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ examName: 'Mamografia' }),
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
        age: 35,
        exams: {
          papanicolau: 'in_day',
        },
      },
    };

    expect(() => healthCheckinSchema.parse(payload)).toThrow(/consent/i);
  });
});
