import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({ role: 'colaboradora' }));
const userState = vi.hoisted(() => ({
  user: {
    id: 'user-1',
    company_id: 'company-1',
    birth_date: '1981-07-30' as string | null,
  },
}));

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

vi.mock('@/repositories/user.repository', () => ({
  getUserById: vi.fn(() => userState.user),
}));

vi.mock('@/repositories/health-checkin.repository', () => ({
  getHealthCheckinExams: vi.fn().mockReturnValue([]),
  getHealthSemaphoreConciergeCase: vi.fn().mockReturnValue(undefined),
  ensureHealthSemaphoreConciergeCase: vi.fn().mockResolvedValue({
    id: 'case-1',
    status: 'open',
    severity: 'urgent',
    created: true,
  }),
  recordHealthCheckinSubmission: vi.fn().mockResolvedValue({
    id: 'case-1',
    status: 'open',
    severity: 'urgent',
    created: true,
  }),
  syncHealthSemaphoreConciergeCase: vi.fn().mockResolvedValue({
    id: 'case-1',
    status: 'open',
    severity: 'urgent',
    created: true,
  }),
}));

import { GET, POST } from '@/app/api/collaborator/health-checkin/route';
import {
  ensureHealthSemaphoreConciergeCase,
  getHealthCheckinExams,
  getHealthSemaphoreConciergeCase,
  recordHealthCheckinSubmission,
  syncHealthSemaphoreConciergeCase,
} from '@/repositories/health-checkin.repository';

const ALL_EXAM_IDS = [
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
];

function completeExamAnswers() {
  return Object.fromEntries(ALL_EXAM_IDS.map((examId) => [
    examId,
    { dueDate: '2027-12-31' },
  ]));
}

describe('/api/collaborator/health-checkin', () => {
  beforeEach(() => {
    authState.role = 'colaboradora';
    userState.user = {
      id: 'user-1',
      company_id: 'company-1',
      birth_date: '1981-07-30',
    };
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses profile birth date, records dated exams and opens a real Concierge case', async () => {
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
            age: 25,
            exams: {
              ...completeExamAnswers(),
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
    expect(recordHealthCheckinSubmission).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      companyId: 'company-1',
      birthDate: '1981-07-30',
      persistBirthDate: false,
      ipAddress: '203.0.113.10',
      userAgent: 'Vitest',
      overallStatus: 'urgent',
      examItems: expect.arrayContaining([
        expect.objectContaining({
          examId: 'papanicolau',
          examName: 'Papanicolau',
          completedDate: '2023-06-15',
          dueDate: '2026-06-30',
          status: 'overdue',
          priority: 'urgent',
        }),
        expect.objectContaining({
          examId: 'mammography',
          examName: 'Mamografia',
          dueDate: '2026-06-29',
          status: 'overdue',
          priority: 'urgent',
        }),
      ]),
    }));
    expect(body).toMatchObject({
      success: true,
      result: {
        source: 'semaforo_exam_quiz_v1',
        overallStatus: 'urgent',
        nextAction: 'offer_concierge',
        conciergeRequired: true,
      },
      conciergeCase: {
        id: 'case-1',
        status: 'open',
        severity: 'urgent',
      },
    });
  });

  it('persists birth date only when the profile does not have one', async () => {
    userState.user.birth_date = null;

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
            birthDate: '1991-07-30',
            exams: completeExamAnswers(),
          },
        }),
      }) as any,
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(200);
    expect(recordHealthCheckinSubmission).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      birthDate: '1991-07-30',
      persistBirthDate: true,
    }));
  });

  it('restores state and creates the missing Concierge case when a saved due date becomes red', async () => {
    vi.mocked(getHealthCheckinExams).mockReturnValue([
      {
        examId: 'mammography',
        examName: 'Mamografia',
        status: 'overdue',
        completedDate: '2024-06-15',
        dueDate: '2026-06-29',
      },
    ]);
    vi.mocked(getHealthSemaphoreConciergeCase).mockReturnValue(undefined);

    const response = await GET(
      new Request('http://local/api/collaborator/health-checkin') as any,
      { params: Promise.resolve({}) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(ensureHealthSemaphoreConciergeCase).toHaveBeenCalledWith({
      userId: 'user-1',
      companyId: 'company-1',
    });
    expect(body).toMatchObject({
      birthDate: '1981-07-30',
      age: 45,
      exams: {
        mammography: {
          completedDate: '2024-06-15',
          dueDate: '2026-06-29',
        },
      },
      result: {
        overallStatus: 'urgent',
      },
      conciergeCase: {
        id: 'case-1',
        status: 'open',
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
    expect(recordHealthCheckinSubmission).not.toHaveBeenCalled();
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
    expect(recordHealthCheckinSubmission).not.toHaveBeenCalled();
  });

  it('rejects incomplete age-applicable exam answers', async () => {
    const response = await POST(
      new Request('http://local/api/collaborator/health-checkin', {
        method: 'POST',
        body: JSON.stringify({
          source: 'semaforo_exam_quiz_v1',
          consent: { accepted: true, version: 'semaforo-exams-v1' },
          answers: {
            exams: {
              papanicolau: { dueDate: '2027-12-31' },
            },
          },
        }),
      }) as any,
      { params: Promise.resolve({}) }
    );

    expect(response.status).toBe(400);
    expect(recordHealthCheckinSubmission).not.toHaveBeenCalled();
  });
});
