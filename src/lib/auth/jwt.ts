import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface TokenPayload extends JWTPayload {
  userId: string;
  role: string;
  companyId: string;
  mustChangePassword?: boolean;
}

function getSecret(envKey: string): Uint8Array {
  const secret = process.env[envKey];
  if (!secret) {
    throw new Error(`Missing environment variable: ${envKey}`);
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: {
  userId: string;
  role: string;
  companyId: string;
  mustChangePassword?: boolean;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    companyId: payload.companyId,
    mustChangePassword: payload.mustChangePassword ?? false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getSecret('JWT_SECRET'));
}

export async function signRefreshToken(payload: {
  userId: string;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret('JWT_REFRESH_SECRET'));
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret('JWT_SECRET'));
  return payload as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload & { userId: string }> {
  const { payload } = await jwtVerify(token, getSecret('JWT_REFRESH_SECRET'));
  return payload as JWTPayload & { userId: string };
}
