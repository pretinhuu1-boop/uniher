import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({ role: 'colaboradora' }));

vi.mock('@/lib/auth/middleware', () => ({
  withRole: (...roles: string[]) => (handler: any) => async (req: Request) => {
    if (!roles.includes(authState.role)) {
      return Response.json({ error: 'Permissao insuficiente' }, { status: 403 });
    }

    return handler(req, {
      auth: { userId: 'user-1', role: authState.role },
      params: Promise.resolve({}),
    });
  },
}));

vi.mock('@/lib/db/init', () => ({
  initDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/repositories/health-score.repository', () => ({
  recordHealthScore: vi.fn().mockResolvedValue({ id: 'score-1' }),
}));

vi.mock('@/repositories/health-checkin.repository', () => ({
  recordHealthCheckinExams: vi.fn().mockResolvedValue(undefined),
  recordHealthCheckinConsent: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/collaborator/health-checkin/route';
import { recordHealthCheckinConsent, recordHealthCheckinExams } from '@/repositories/health-checkin.repository';
import { recordHealthScore } from '@/repositories/health-score.repository';

describe('POST /api/collaborator/health-checkin', () => {
  beforeEach(() => {
    authState.role = 'colaboradora';
    vi.clearAllMocks();
  });

  it('records private semaphore scores from the exam quiz without auto-creating Concierge cases', async () => {
    const response = await POST(
      new Request('http://local/api/collaborator/health-checkin', {
        method: 'POST',
        body: JSON.stringify({
          source: 'exam_quiz_v1',
          consent: {
            accepted: true,
            version: 'health-checkin-v1',
          },
          answers: {
            lastGynecologist: 'never',
            mammography: 'never_needed',
            papanicolau: 'never',
            familyHistory: 'close',
            diabetesHistory: 'self',
            menstrualCycle: 'painful',
            mentalHealth: 'concerning',
            lifestyle: 'inactive',
            smoking: 'current',
          },
        }),
        headers: {
          'x-forwarded-for': '203.0.113.10',
          'user-agent': 'Vitest',
        },
      }) as any,
      { params: Promise.resolve({}) }
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(recordHealthCheckinConsent).toHaveBeenCalledWith({
      userId: 'user-1',
      ipAddress: '203.0.113.10',
      userAgent: 'Vitest',
    });
    expect(recordHealthScore).toHaveBeenCalledWith('user-1', 'Prevencao', 1);
    expect(recordHealthCheckinExams).toHaveBeenCalledWith('user-1', expect.arrayContaining([
      expect.objectContaining({ examName: 'Consulta ginecologica', status: 'overdue', priority: 'urgent' }),
      expect.objectContaining({ examName: 'Papanicolau', status: 'overdue', priority: 'urgent' }),
    ]));
    expect(body).toMatchObject({
      success: true,
      result: {
        source: 'exam_quiz_v1',
        overallStatus: 'urgent',
        nextAction: 'offer_concierge',
        createConciergeCase: false,
      },
    });
  });

  it('rejects non-collaborator health check-in submissions', async () => {
    authState.role = 'rh';

    const response = await POST(
      new Request('http://local/api/collaborator/health-checkin', {
        method: 'POST',
        body: '{}',
      }) as any,
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(403);
    expect(recordHealthCheckinConsent).not.toHaveBeenCalled();
    expect(recordHealthScore).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid health check-in payloads without writing private data', async () => {
    const response = await POST(
      new Request('http://local/api/collaborator/health-checkin', {
        method: 'POST',
        body: JSON.stringify({
          source: 'exam_quiz_v1',
          consent: { accepted: false, version: 'health-checkin-v1' },
          answers: {},
        }),
      }) as any,
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(400);
    expect(recordHealthCheckinConsent).not.toHaveBeenCalled();
    expect(recordHealthCheckinExams).not.toHaveBeenCalled();
    expect(recordHealthScore).not.toHaveBeenCalled();
  });
});
