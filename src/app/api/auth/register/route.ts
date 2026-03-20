import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { register } from '@/services/auth.service';
import { registerSchema } from '@/lib/validation/schemas';
import { checkAuthRateLimit } from '@/lib/security/rate-limit';
import { handleApiError } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    await initDb();
    await checkAuthRateLimit(req);

    const body = await req.json();
    const input = registerSchema.parse(body);

    const result = await register(input);

    return NextResponse.json(result, { status: 201 });
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
