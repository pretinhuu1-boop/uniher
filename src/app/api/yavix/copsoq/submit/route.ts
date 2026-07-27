import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { submit } from '@/lib/yavix/copsoq.mock';
import { isYavixMock } from '@/lib/yavix/config';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';
import { requireNr1PsychosocialConsent, requireNr1RuntimeEntitlement } from '@/lib/nr1/runtime-entitlement';
import type { CopsoqIncomplete, CopsoqSubmitResult } from '@/lib/yavix/copsoq.types';

// PUT /api/yavix/copsoq/submit
// Valida completude NO SERVIDOR (todas type==='QUESTION' respondidas — SPEC §4-S).
// Completo → 200 { status:'DONE' }. Incompleto → 422 { error:'INCOMPLETE', missing[] }.
export const PUT = withRole('colaboradora', 'lideranca')(async (req, { auth }) => {
  try {
    await checkWriteRateLimit(req);
    const entitlementError = await requireNr1RuntimeEntitlement(auth);
    if (entitlementError) return entitlementError;
    const consentError = await requireNr1PsychosocialConsent(auth.userId);
    if (consentError) return consentError;

    if (isYavixMock()) {
      const result = submit(auth.userId);
      if (!result.done) {
        const body: CopsoqIncomplete = { error: 'INCOMPLETE', missing: result.missing };
        return NextResponse.json(body, { status: 422 });
      }
      const ok: CopsoqSubmitResult = { status: 'DONE' };
      return NextResponse.json(ok, { status: 200 });
    }

    // TODO(Onda 3 — BLOQUEADO): só chama PUT /form/{sessionId} da Yavix se completo.
    return NextResponse.json(
      { error: 'Integração Yavix real ainda não habilitada (Onda 3).' },
      { status: 503 },
    );
  } catch (error) {
    return handleApiError(error);
  }
});
