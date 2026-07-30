import { describe, expect, it } from 'vitest';
import { mapHealthCheckinToSemaphore } from '@/lib/health-checkin/mapper';
import { healthCheckinSchema } from '@/lib/validation/schemas';

describe('exam-based health check-in mapper', () => {
  it('maps urgent exam answers to private red prevention status without auto-creating a Concierge case', () => {
    const result = mapHealthCheckinToSemaphore({
      lastGynecologist: 'never',
      mammography: 'delayed',
      papanicolau: 'never',
      familyHistory: 'close',
      diabetesHistory: 'self',
      menstrualCycle: 'painful',
      mentalHealth: 'concerning',
      lifestyle: 'inactive',
      smoking: 'current',
    }, { conciergeEnabled: true });

    expect(result.source).toBe('exam_quiz_v1');
    expect(result.overallStatus).toBe('urgent');
    expect(result.nextAction).toBe('offer_concierge');
    expect(result.createConciergeCase).toBe(false);

    expect(result.semaforoScores).toContainEqual({
      dimension: 'Prevencao',
      score: 1,
      status: 'red',
    });

    expect(result.examItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ examName: 'Papanicolau', status: 'overdue', priority: 'urgent' }),
      expect.objectContaining({ examName: 'Consulta ginecologica', status: 'overdue', priority: 'urgent' }),
    ]));
  });

  it('does not treat mammography that is not yet indicated as urgent or overdue', () => {
    const result = mapHealthCheckinToSemaphore({
      lastGynecologist: 'recent',
      mammography: 'never_needed',
      papanicolau: 'recent',
      familyHistory: 'no',
      diabetesHistory: 'no',
      menstrualCycle: 'regular',
      mentalHealth: 'good',
      lifestyle: 'active',
      smoking: 'never',
    });

    expect(result.overallStatus).toBe('safe');
    expect(result.examItems).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ examName: 'Mamografia' }),
    ]));
  });

  it('requires explicit consent before accepting exam quiz answers', () => {
    const payload = {
      source: 'exam_quiz_v1',
      consent: {
        accepted: false,
        version: 'health-checkin-v1',
      },
      answers: {
        lastGynecologist: 'recent',
        mammography: 'na',
        papanicolau: 'recent',
        familyHistory: 'no',
        diabetesHistory: 'no',
        menstrualCycle: 'regular',
        mentalHealth: 'good',
        lifestyle: 'active',
        smoking: 'never',
      },
    };

    expect(() => healthCheckinSchema.parse(payload)).toThrow(/consent/i);
  });
});
