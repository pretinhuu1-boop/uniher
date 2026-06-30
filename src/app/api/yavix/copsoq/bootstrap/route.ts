import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { buildBootstrap } from '@/lib/yavix/copsoq.mock';
import { isYavixMock } from '@/lib/yavix/config';
import { checkReadRateLimit } from '@/lib/security/rate-limit';
import type { CopsoqBootstrap, Locale } from '@/lib/yavix/copsoq.types';

// GET /api/yavix/copsoq/bootstrap
// Orquestra (server-side) a montagem da tela do questionário numa única chamada.
// SPEC §4-B. Protegido por withRole (apenas colaboradora/lideranca).
export const GET = withRole('colaboradora', 'lideranca')(async (req, { auth }) => {
  try {
    await checkReadRateLimit(req);
    const url = new URL(req.url);
    const localeParam = url.searchParams.get('locale');
    const locale: Locale =
      localeParam === 'en' || localeParam === 'es' ? localeParam : 'pt';

    // sessionId persistido (retomada): query ?sessionId= ou header x-copsoq-session.
    // O mock chaveia por userId e o ignora; na Onda 3 ele identifica a sessão Yavix
    // (formSessionId) para reidratar a sessão correta da colaboradora.
    const sessionId =
      url.searchParams.get('sessionId') ?? req.headers.get('x-copsoq-session') ?? undefined;

    if (isYavixMock()) {
      // TODO(Onda 3): repassar sessionId ao Yavix; o mock o ignora (chaveia por userId).
      const bootstrap: CopsoqBootstrap = buildBootstrap(auth.userId, locale, sessionId);
      return NextResponse.json(bootstrap);
    }

    // TODO(Onda 3 — BLOQUEADO por service-token/SSO Yavix):
    //   1. GET  /terms/verify           → hasPendingTerms + terms[]
    //   2. GET  /form/COPSOQ41          → definição (questions[])
    //   3. POST /form                   → sessionId (idempotente)
    //   4. GET  /form/answers/{id}      → answers (reidratação)
    //   companyId do JWT (auth.companyId) seleciona a credencial Yavix da empresa.
    //   O browser NUNCA recebe token Yavix. Erros Yavix → src/lib/errors (401/403/404/429/503).
    return NextResponse.json(
      { error: 'Integração Yavix real ainda não habilitada (Onda 3).' },
      { status: 503 },
    );
  } catch (error) {
    return handleApiError(error);
  }
});
