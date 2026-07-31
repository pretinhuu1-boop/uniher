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

describe('POST /api/collaborator/health-checkin', () => {
  beforeEach(() => {
    authState.role = 'colaboradora';
    vi.clearAllMocks();
  });

  it('records private exam statuses without writing a clinical health score', async () => {
    const response = await POST(
      new Request('http://local/api/collaborator/health-checkin', {
        method: 'POST',
        body: JSON.stringify({
          source: 'semaforo_exam_quiz_v1',
          consent: {
            accepted: true,
            version: 'semaforo-exams-v1',
          },
          answers: {
            age: 45,
            exams: {
              papanicolau: 'overdue',
              mammography: 'overdue',
              clinical_breast_exam: 'due_soon',
              cbc_ferritin: 'in_day',
            },
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
    expect(recordHealthCheckinExams).toHaveBeenCalledWith('user-1', expect.arrayContaining([
      expect.objectContaining({ examName: 'Papanicolau', status: 'overdue', priority: 'urgent' }),
      expect.objectContaining({ examName: 'Mamografia', status: 'overdue', priority: 'urgent' }),
    ]));
    expect(body).toMatchObject({
      success: true,
      result: {
        source: 'semaforo_exam_quiz_v1',
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
  });

  it('returns 400 for invalid health check-in payloads without writing private data', async () => {
    const response = await POST(
      new Request('http://local/api/collaborator/health-checkin', {
        method: 'POST',
        body: JSON.stringify({
          source: 'semaforo_exam_quiz_v1',
          consent: { accepted: false, version: 'semaforo-exams-v1' },
          answers: {},
        }),
      }) as any,
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(400);
    expect(recordHealthCheckinConsent).not.toHaveBeenCalled();
    expect(recordHealthCheckinExams).not.toHaveBeenCalled();
  });
});
