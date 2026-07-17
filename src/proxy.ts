import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const cookieToken = request.cookies.get('uniher-access-token')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const accessToken = cookieToken || bearerToken;

  if (!accessToken) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(accessToken, secret);
    const role = typeof payload.role === 'string' ? payload.role : '';
    const mustChangePassword = payload.mustChangePassword === true;
    const isAdminSurface = pathname.startsWith('/admin') || pathname.startsWith('/api/admin/');

    if (role !== 'admin' && isAdminSurface) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
      }

      return NextResponse.redirect(new URL('/dashboard', request.url));
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
          return NextResponse.json(
            { error: 'Troca de senha obrigatoria', mustChangePassword: true },
            { status: 403 },
          );
        }

        return NextResponse.redirect(new URL('/primeiro-acesso', request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 401 });
    }

    const refreshToken = request.cookies.get('uniher-refresh-token')?.value;
    if (refreshToken) {
      return NextResponse.next();
    }

    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)',
  ],
};
