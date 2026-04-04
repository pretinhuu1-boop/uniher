import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const isProd = process.env.NODE_ENV === 'production';
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
const hasHttpsAppUrl = /^https:\/\//i.test(appUrl);
const isTrustworthyOrigin =
  hasHttpsAppUrl || /^http:\/\/localhost(?::\d+)?$/i.test(appUrl);

const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/proposta',
  '/esqueci-senha',
  '/redefinir-senha',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/leads',
  '/api/health',
  '/api/push/vapid-key',
];

const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/invites/',
  '/invite/',
  '/_next/',
  '/favicon',
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (pathname.includes('.')) return true;
  return false;
}

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    isProd
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://wa.me",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(hasHttpsAppUrl ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

function withSecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('x-nonce', nonce);

  if (isTrustworthyOrigin) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  }

  return response;
}

function nextWithNonce(request: NextRequest, nonce: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  return withSecurityHeaders(
    NextResponse.next({
      request: { headers: requestHeaders },
    }),
    nonce,
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = generateNonce();

  if (isPublicRoute(pathname)) {
    return nextWithNonce(request, nonce);
  }

  const cookieToken = request.cookies.get('uniher-access-token')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const accessToken = cookieToken || bearerToken;

  if (!accessToken) {
    if (pathname.startsWith('/api/')) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Nao autenticado' }, { status: 401 }),
        nonce,
      );
    }

    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl), nonce);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(accessToken, secret);
    const role = typeof payload.role === 'string' ? payload.role : '';
    const mustChangePassword = payload.mustChangePassword === true;
    const isAdminSurface = pathname.startsWith('/admin') || pathname.startsWith('/api/admin/');

    if (role !== 'admin' && isAdminSurface) {
      if (pathname.startsWith('/api/')) {
        return withSecurityHeaders(
          NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 }),
          nonce,
        );
      }

      return withSecurityHeaders(
        NextResponse.redirect(new URL('/dashboard', request.url)),
        nonce,
      );
    }

    if (mustChangePassword) {
      const allowedPaths = [
        '/primeiro-acesso',
        '/api/auth/change-password',
        '/api/auth/confirm-first-access',
        '/api/auth/me',
        '/api/auth/logout',
        '/api/auth/refresh',
        '/api/users/me',
      ];

      if (!allowedPaths.some((path) => pathname.startsWith(path))) {
        if (pathname.startsWith('/api/')) {
          return withSecurityHeaders(
            NextResponse.json(
              { error: 'Troca de senha obrigatoria', mustChangePassword: true },
              { status: 403 },
            ),
            nonce,
          );
        }

        return withSecurityHeaders(
          NextResponse.redirect(new URL('/primeiro-acesso', request.url)),
          nonce,
        );
      }
    }

    return nextWithNonce(request, nonce);
  } catch {
    if (pathname.startsWith('/api/')) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Token expirado' }, { status: 401 }),
        nonce,
      );
    }

    const refreshToken = request.cookies.get('uniher-refresh-token')?.value;
    if (refreshToken) {
      return nextWithNonce(request, nonce);
    }

    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl), nonce);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)',
  ],
};
