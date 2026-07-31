import { NextRequest, NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import {
  calculateAge,
  type ExamAnswer,
  getApplicableExams,
  mapHealthCheckinToSemaphore,
} from '@/lib/health-checkin/mapper';
import { healthCheckinSchema } from '@/lib/validation/schemas';
import {
  ensureHealthSemaphoreConciergeCase,
  getHealthCheckinExams,
  getHealthSemaphoreConciergeCase,
  recordHealthCheckinSubmission,
  type HealthCheckinExamItem,
  type StoredHealthCheckinExam,
} from '@/repositories/health-checkin.repository';
import { getUserById } from '@/repositories/user.repository';

function toAnswers(rows: StoredHealthCheckinExam[]): Record<string, ExamAnswer> {
  return Object.fromEntries(rows.map((row) => [
    row.examId,
    {
      completedDate: row.completedDate,
      dueDate: row.dueDate,
      unknown: row.unknown ?? !row.dueDate,
      notApplicable: row.notApplicable ?? false,
      legacyStatus: row.dueDate ? undefined : row.status,
    },
  ]));
}

function toPersistenceItems(params: {
  birthDate: string;
  answers: Record<string, ExamAnswer>;
  resultItems: ReturnType<typeof mapHealthCheckinToSemaphore>['examItems'];
}): HealthCheckinExamItem[] {
  const resultByExamId = new Map(params.resultItems.map((item) => [item.examId, item]));
  const age = calculateAge(params.birthDate);

  return getApplicableExams(age).map((exam) => {
    const answer = params.answers[exam.id] ?? { unknown: true };
    const resultItem = resultByExamId.get(exam.id);
    const notApplicable = Boolean(answer.notApplicable && exam.conditional);

    return {
      examId: exam.id,
      examName: exam.name,
      status: resultItem?.status ?? 'pending',
      priority: resultItem?.priority,
      completedDate: answer.completedDate ?? null,
      dueDate: answer.unknown || notApplicable ? null : answer.dueDate ?? null,
      unknown: Boolean(answer.unknown),
      notApplicable,
    };
  });
}

export const GET = withRole('colaboradora', 'lideranca')(async (
  _req: NextRequest,
  { auth }
) => {
  try {
    await initDb();
    const user = getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const rows = getHealthCheckinExams(auth.userId);
    const exams = toAnswers(rows);
    const birthDate = user.birth_date ?? null;
    const result = birthDate && rows.length > 0
      ? mapHealthCheckinToSemaphore(
        { birthDate, exams },
        { conciergeEnabled: true }
      )
      : null;
    let conciergeCase = getHealthSemaphoreConciergeCase(auth.userId);
    if (result?.overallStatus === 'urgent' && !conciergeCase) {
      conciergeCase = await ensureHealthSemaphoreConciergeCase({
        userId: auth.userId,
        companyId: user.company_id,
      });
    }

    return NextResponse.json({
      birthDate,
      age: birthDate ? calculateAge(birthDate) : null,
      exams,
      result,
      conciergeCase: conciergeCase ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withRole('colaboradora', 'lideranca')(async (
  req: NextRequest,
  { auth }
) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = healthCheckinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const user = getUserById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
    }

    const input = parsed.data;
    const birthDate = user.birth_date ?? input.answers.birthDate;
    if (!birthDate) {
      return NextResponse.json(
        { error: 'Informe sua data de nascimento para calcular os exames aplicaveis.' },
        { status: 400 }
      );
    }

    const age = calculateAge(birthDate);
    if (age < 20 || age > 120) {
      return NextResponse.json(
        { error: 'Data de nascimento fora da faixa atendida por este quiz.' },
        { status: 400 }
      );
    }

    const answers = input.answers.exams as Record<string, ExamAnswer>;
    const incompleteExamIds = getApplicableExams(age)
      .filter((exam) => {
        const answer = answers[exam.id];
        if (!answer) return true;
        if (answer.notApplicable) return !exam.conditional;
        return !answer.unknown && !answer.dueDate;
      })
      .map((exam) => exam.id);
    if (incompleteExamIds.length > 0) {
      return NextResponse.json(
        { error: 'Preencha todos os exames aplicaveis.', incompleteExamIds },
        { status: 400 }
      );
    }

    const result = mapHealthCheckinToSemaphore(
      { birthDate, exams: answers },
      { conciergeEnabled: true }
    );
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || '';

    const conciergeCase = await recordHealthCheckinSubmission({
      userId: auth.userId,
      companyId: user.company_id,
      birthDate,
      persistBirthDate: !user.birth_date,
      ipAddress,
      userAgent,
      overallStatus: result.overallStatus,
      examItems: toPersistenceItems({
        birthDate,
        answers,
        resultItems: result.examItems,
      }),
    });

    return NextResponse.json({
      success: true,
      result,
      conciergeCase: conciergeCase ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
