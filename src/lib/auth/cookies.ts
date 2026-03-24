import { cookies } from 'next/headers';

const ACCESS_TOKEN_NAME = 'uniher-access-token';
const REFRESH_TOKEN_NAME = 'uniher-refresh-token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_TOKEN_NAME, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutos
  });

  cookieStore.set(REFRESH_TOKEN_NAME, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 48 * 60 * 60, // 48 horas
  });
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_NAME)?.value;
}

export async function getRefreshTokenCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_NAME)?.value;
}

export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_NAME);
  cookieStore.delete(REFRESH_TOKEN_NAME);
}
