import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { login } from '@/services/auth.service';
import { loginSchema } from '@/lib/validation/schemas';
import { checkAuthRateLimit } from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    await initDb();
    await checkAuthRateLimit(req);

    const body = await req.json();
    console.log('[debug-route] POST /api/auth/login:', body.email);
    const input = loginSchema.parse(body);

    const result = await login(input);
    console.log('[debug-route] SUCCESS:', body.email);

    return NextResponse.json(result);
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
