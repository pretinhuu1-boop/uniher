import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { register } from '@/services/auth.service';
import { registerSchema } from '@/lib/validation/schemas';
import { checkAuthRateLimit } from '@/lib/security/rate-limit';
import { handleApiError, ConflictError } from '@/lib/errors';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';

export async function POST(req: Request) {
  try {
    await initDb();
    await checkAuthRateLimit(req);

    const body = await req.json();
    const input = registerSchema.parse(body);
    input.name = input.name.replace(/<[^>]*>/g, '').trim();

    const result = await register(input);
    const response = NextResponse.json({
      user: result.user,
      accessToken: result.accessToken,
    }, { status: 201 });
    return setAuthCookiesOnResponse(response, result.accessToken, result.refreshToken);
  } catch (error) {
    // Prevent email enumeration: return generic 400 for conflict errors
    if (error instanceof ConflictError) {
      return NextResponse.json(
        { error: 'Não foi possível criar a conta. Verifique os dados e tente novamente.', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: (error as { issues: unknown[] }).issues },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
