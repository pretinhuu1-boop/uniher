import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { refresh } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';

export async function POST() {
  try {
    await initDb();
    const result = await refresh();
    const response = NextResponse.json({ success: true });
    return setAuthCookiesOnResponse(response, result.accessToken, result.refreshToken);
  } catch (error) {
    return handleApiError(error);
  }
}
