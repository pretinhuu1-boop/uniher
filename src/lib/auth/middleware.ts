import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, type TokenPayload } from './jwt';
import { getAccessToken } from './cookies';
import { isTokenBlacklisted } from './token-blacklist';

export interface AuthContext {
  params: Promise<Record<string, string>>;
  auth: TokenPayload;
}

type ApiHandler = (
  req: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

/** Wrapper que protege um API route handler com autenticacao JWT */
export function withAuth(handler: ApiHandler) {
  return async (req: NextRequest, segmentData: { params: Promise<Record<string, string>> }) => {
    try {
      // Tentar ler token do cookie
      const token = await getAccessToken();

      // Fallback: ler do header Authorization
      const authHeader = req.headers.get('Authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

      const accessToken = token || bearerToken;

      if (!accessToken) {
        return NextResponse.json(
          { error: 'Token de autenticação não fornecido' },
          { status: 401 }
        );
      }

      if (isTokenBlacklisted(accessToken)) {
        return NextResponse.json(
          { error: 'Token revogado' },
          { status: 401 }
        );
      }

      const payload = await verifyAccessToken(accessToken);

      return handler(req, {
        params: segmentData.params,
        auth: payload,
      });
    } catch {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }
  };
}

/** Wrapper que exige role especifica */
export function withRole(...roles: string[]) {
  return (handler: ApiHandler) => {
    return withAuth(async (req, context) => {
      if (!roles.includes(context.auth.role)) {
        return NextResponse.json(
          { error: 'Permissão insuficiente' },
          { status: 403 }
        );
      }
      return handler(req, context);
    });
  };
}

export function withMasterAdmin(handler: ApiHandler) {
  return withRole('admin')(async (req, context) => {
    const hasLegacyAdminToken = context.auth.isMasterAdmin === undefined && context.auth.role === 'admin';
    if (context.auth.isMasterAdmin !== true && !hasLegacyAdminToken) {
      return NextResponse.json(
        { error: 'Acesso restrito ao Admin Master' },
        { status: 403 }
      );
    }
    return handler(req, context);
  });
}
