import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { login } from '@/services/auth.service';
import { loginSchema } from '@/lib/validation/schemas';
import { checkAuthRateLimit, recordFailedAuth } from '@/lib/security/rate-limit';
import { handleApiError, UnauthorizedError } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    await initDb();
    await checkAuthRateLimit(req);

    const body = await req.json();
    const input = loginSchema.parse(body);

    try {
      const result = await login(input);
      return NextResponse.json(result);
    } catch (authError) {
      // Record failed attempt in brute-force tracker (never bypassed by PLAYWRIGHT_TEST).
      // If limit exceeded, recordFailedAuth throws RateLimitError → return 429.
      if (authError instanceof UnauthorizedError) {
        try {
          await recordFailedAuth(req, input.email);
        } catch (rlErr) {
          return handleApiError(rlErr);
        }
      }
      return handleApiError(authError);
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: (error as { issues: unknown[] }).issues },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
