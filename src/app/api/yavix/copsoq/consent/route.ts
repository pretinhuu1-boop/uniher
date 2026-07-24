import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { acceptTerm } from '@/lib/yavix/copsoq.mock';
import { isYavixMock } from '@/lib/yavix/config';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';
import { getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { requireNr1RuntimeEntitlement } from '@/lib/nr1/runtime-entitlement';

// SPEC §4-C. Validação Zod do corpo.
const consentSchema = z.object({
  termId: z.number().int().positive(),
});

// POST /api/yavix/copsoq/consent
// ⚠️ Degrau 4 / jurídico: o aceite do termo é AÇÃO DA COLABORADORA (clique dela
//    na UI). NUNCA automatizar o aceite em nome dela pelo servidor.
export const POST = withRole('colaboradora', 'lideranca')(async (req, { auth }) => {
  try {
    await checkWriteRateLimit(req);
    const entitlementError = await requireNr1RuntimeEntitlement(auth);
    if (entitlementError) return entitlementError;

    const body = await req.json().catch(() => null);
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Corpo inválido: termId é obrigatório.');
    }
    const { termId } = parsed.data;

    if (isYavixMock()) {
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

      // LGPD (art. 11): registra o consentimento de dado sensível de saúde em
      // user_consents (tipo 'nr1_psychosocial') com IP + user-agent + timestamp —
      // base legal auditável do tratamento. O aceite acima é clique da colaboradora
      // (nunca automatizado). TODO(Onda 3): replicar esta gravação no caminho Yavix real.
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
      const userAgent = req.headers.get('user-agent') || '';
      const wq = getWriteQueue();
      await wq.enqueue((db) => {
        db.prepare(
          'INSERT INTO user_consents (id, user_id, consent_type, granted, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        ).run(nanoid(), auth.userId, 'nr1_psychosocial', 1, ip, userAgent);
      });

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
