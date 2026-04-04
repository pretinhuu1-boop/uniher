import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { register } from '@/services/auth.service';
import { registerSchema } from '@/lib/validation/schemas';
import { checkAuthRateLimit } from '@/lib/security/rate-limit';
import { handleApiError, ConflictError } from '@/lib/errors';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';
import { getReadDb } from '@/lib/db';

export async function POST(req: Request) {
  try {
    await initDb();
    await checkAuthRateLimit(req);

    const body = await req.json();
    const input = registerSchema.parse(body);
    input.name = input.name.replace(/<[^>]*>/g, '').trim();

    const result = await register(input);
    const prefRow = getReadDb()
      .prepare("SELECT pref_value FROM user_preferences WHERE user_id = ? AND pref_key = 'first_access_tour_completed'")
      .get(result.user.id) as { pref_value?: string } | undefined;
    const response = NextResponse.json({
      user: {
        ...result.user,
        isMasterAdmin: result.user.is_master_admin === 1,
        mustChangePassword: result.user.must_change_password === 1,
        firstAccessTourCompleted: prefRow?.pref_value === '1',
      },
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
