import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Rotas que nao precisam de autenticacao
const PUBLIC_ROUTES = [
  '/',
  '/auth',
  '/proposta',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/leads',
];

// Prefixos publicos
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/_next/',
  '/favicon',
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // Arquivos estaticos
  if (pathname.includes('.')) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas publicas passam direto
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Verificar token de acesso no cookie ou header Authorization
  const cookieToken = request.cookies.get('uniher-access-token')?.value;
  const authHeader = request.headers.get('Authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const accessToken = cookieToken || bearerToken;

  if (!accessToken) {
    // Se e API, retornar 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    // Se e pagina, redirecionar para login
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar se o JWT e valido (sem checar DB, apenas assinatura)
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(accessToken, secret);

    // Redirecionar para troca obrigatoria de senha se necessario
    if (
      (payload as any).mustChangePassword === true &&
      pathname !== '/primeiro-acesso' &&
      !pathname.startsWith('/api/auth/')
    ) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Troca de senha obrigatória', mustChangePassword: true }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/primeiro-acesso', request.url));
    }

    return NextResponse.next();
  } catch {
    // Token invalido ou expirado
    // Tentar refresh automatico via redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 401 });
    }
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|ico)$).*)',
  ],
};
