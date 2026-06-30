import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError, ValidationError } from '@/lib/errors';
import { saveAnswer } from '@/lib/yavix/copsoq.mock';
import { isYavixMock } from '@/lib/yavix/config';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';
import type { CopsoqAnswerInput } from '@/lib/yavix/copsoq.types';

// SPEC §4-A. O FE manda SÓ { code, value }.
const answerSchema = z.object({
  code: z.number().int().min(1).max(120),
  value: z.string().min(1),
});

// PATCH /api/yavix/copsoq/answer
// O PROXY/mock monta o payload Yavix value{ value:Number(value),
//   optionIndex:<0-based achado por value>, option:<snapshot das opções> }
//   a partir da definição em cache. O FE NÃO conhece optionIndex nem o snapshot.
// Índice 1-based(value) / 0-based(optionIndex): resolvido SÓ no servidor/mock.
export const PATCH = withRole('colaboradora', 'lideranca')(async (req, { auth }) => {
  try {
    await checkWriteRateLimit(req);
    const body = await req.json().catch(() => null);
    const parsed = answerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Corpo inválido: code e value são obrigatórios.');
    }
    const input: CopsoqAnswerInput = parsed.data;

    if (isYavixMock()) {
      const result = saveAnswer(auth.userId, input.code, input.value);
      if (!result.ok) {
        // code inexistente, não-QUESTION, ou value fora das opções → 400.
        throw new ValidationError('code ou value inválido para esta pergunta.');
      }
      return new NextResponse(null, { status: 204 });
    }

    // TODO(Onda 3 — BLOQUEADO): PATCH /form/{sessionId} { code, value{...} } na Yavix.
    //   O proxy resolve optionIndex/option snapshot a partir da definição cacheada.
    return NextResponse.json(
      { error: 'Integração Yavix real ainda não habilitada (Onda 3).' },
      { status: 503 },
    );
  } catch (error) {
    return handleApiError(error);
  }
});
