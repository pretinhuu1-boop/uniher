import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { acceptTerm } from '@/lib/yavix/copsoq.mock';

// SPEC §4-C. Validação Zod do corpo.
const consentSchema = z.object({
  termId: z.number().int().positive(),
});

// POST /api/yavix/copsoq/consent
// ⚠️ Degrau 4 / jurídico: o aceite do termo é AÇÃO DA COLABORADORA (clique dela
//    na UI). NUNCA automatizar o aceite em nome dela pelo servidor.
export const POST = withRole('colaboradora', 'lideranca')(async (req, { auth }) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Corpo inválido: termId é obrigatório.');
    }
    const { termId } = parsed.data;

    if (process.env.YAVIX_MOCK !== '0') {
      const result = acceptTerm(auth.userId, termId);
      if (!result.ok) {
        if (result.reason === 'UNKNOWN_TERM') {
          throw new NotFoundError('Termo não encontrado.');
        }
        if (result.reason === 'ALREADY_ACCEPTED') {
          throw new ConflictError('Termo já aceito.');
        }
        // Qualquer reason não mapeado não pode virar falso-sucesso (204).
        throw new ValidationError('Não foi possível registrar o aceite.');
      }

      // INTENÇÃO de gravar o consentimento em `user_consents` (tipo
      // 'nr1_psychosocial') com IP + timestamp + actor (LGPD / consent tracking).
      // Comentado: a infra de consents (migration/repository) não está trivial
      // neste scaffold. Wiring real fica para a onda de persistência.
      //   await consentRepo.record({
      //     userId: auth.userId,
      //     type: 'nr1_psychosocial',
      //     ip: req.headers.get('x-forwarded-for') ?? undefined,
      //   });

      return new NextResponse(null, { status: 204 });
    }

    // TODO(Onda 3 — BLOQUEADO): PUT /terms/update { formConfigId: termId } na Yavix.
    return NextResponse.json(
      { error: 'Integração Yavix real ainda não habilitada (Onda 3).' },
      { status: 503 },
    );
  } catch (error) {
    return handleApiError(error);
  }
});
