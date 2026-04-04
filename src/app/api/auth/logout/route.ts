import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { initDb } from '@/lib/db/init';
import { logout } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';
import { clearAuthCookiesOnResponse, getAccessToken } from '@/lib/auth/cookies';
import { blacklistToken } from '@/lib/auth/token-blacklist';

export async function POST(req: NextRequest) {
  try {
    await initDb();

    // Blacklist current access token so it can't be reused
    const accessToken = await getAccessToken();
    if (accessToken) {
      blacklistToken(accessToken);
    }

    await logout();
    const response = NextResponse.json({ success: true });
    return clearAuthCookiesOnResponse(response);
  } catch (error) {
    return handleApiError(error);
  }
}
