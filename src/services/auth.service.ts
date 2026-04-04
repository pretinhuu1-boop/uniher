import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth/jwt';
import { getRefreshTokenCookie } from '@/lib/auth/cookies';
import * as userRepo from '@/repositories/user.repository';
import * as companyRepo from '@/repositories/company.repository';
import * as refreshTokenRepo from '@/repositories/refresh-token.repository';
import { ConflictError, UnauthorizedError, ValidationError } from '@/lib/errors';
import type { RegisterInput, LoginInput } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/security/sanitize';
import { logAudit } from '@/lib/audit';

// Pre-computed dummy hash for timing attack mitigation.
// Generated once at server start so bcrypt always does a full cost-12 computation
// even when the user doesn't exist, preventing email enumeration via timing.
let _dummyHash: string | null = null;
async function getDummyHash(): Promise<string> {
  if (!_dummyHash) {
    _dummyHash = await hashPassword('__timing_mitigation_dummy__never_matches__');
  }
  return _dummyHash;
}

interface AuthResult {
  user: userRepo.PublicUser;
  accessToken: string;
  refreshToken: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const sanitized = sanitizeObject(input as Record<string, unknown>) as RegisterInput;

  // Verificar se email ja existe (mensagem genérica para evitar enumeração)
  const existing = userRepo.getUserByEmail(sanitized.email);
  if (existing) {
    throw new ConflictError('Não foi possível criar a conta. Verifique os dados e tente novamente.');
  }

  // Se role = rh e nao tem companyId, precisa criar empresa
  let companyId = sanitized.companyId;
  if (!companyId) {
    if (sanitized.role === 'rh') {
      if (sanitized.company) {
        const company = await companyRepo.createCompany({
          name: sanitized.company.name,
          tradeName: sanitized.company.tradeName || sanitized.company.name,
          cnpj: sanitized.company.cnpj,
          sector: sanitized.company.sector,
          contactName: sanitized.company.contactName || sanitized.name,
          contactEmail: sanitized.company.contactEmail || sanitized.email,
          contactPhone: sanitized.company.contactPhone,
        });
        companyId = company.id;
      } else {
        throw new ValidationError('Dados da empresa são obrigatórios para novo cadastro de RH');
      }
    } else {
      throw new ValidationError('companyId é obrigatório para colaboradoras e lideranças');
    }
  }

  const passwordHash = await hashPassword(sanitized.password);

  const user = await userRepo.createUser({
    name: sanitized.name,
    email: sanitized.email,
    passwordHash,
    role: sanitized.role,
    companyId,
    departmentId: sanitized.departmentId,
    isMasterAdmin: sanitized.role === 'admin',
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id ?? '',
    isMasterAdmin: user.is_master_admin === 1,
  });

  const refreshToken = await signRefreshToken({ userId: user.id });
  await refreshTokenRepo.createRefreshToken(user.id, refreshToken);

  return {
    user: userRepo.toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = userRepo.getUserByEmail(input.email);

  if (!user) {
    // Timing attack mitigation: always run full bcrypt even when user not found
    // Uses a lazily-computed real bcrypt hash (cost 12) so the timing is identical
    await verifyPassword(input.password, await getDummyHash());
    logAudit({
      actorId: 'anonymous',
      actorEmail: input.email,
      actorRole: 'unknown',
      action: 'login_failed',
      entityType: 'auth',
      entityId: '',
      details: { reason: 'User not found' },
    });
    throw new UnauthorizedError('Email ou senha incorretos');
  }

  const valid = await verifyPassword(input.password, user.password_hash);

  if (!valid) {
    logAudit({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'login_failed',
      entityType: 'auth',
      entityId: user.id,
      details: { reason: 'Invalid password' },
    });
    throw new UnauthorizedError('Email ou senha incorretos');
  }

  // Verificar se a empresa está ativa (exceto admin que não tem company)
  if (user.company_id) {
    const company = companyRepo.getCompanyById(user.company_id);
    if (company && (company as typeof company & { is_active?: number }).is_active === 0) {
      throw new UnauthorizedError('Empresa suspensa. Entre em contato com o suporte.');
    }
  }

  // Verificar se usuário não está bloqueado
  if ((user as typeof user & { blocked?: number }).blocked === 1) {
    throw new UnauthorizedError('Usuário bloqueado. Entre em contato com o suporte.');
  }

  // NOTE: last_active is NOT updated here — it is set exclusively by the daily check-in
  // so that streak detection and "already done today" logic remain correct.

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id ?? '',
    isMasterAdmin: user.is_master_admin === 1,
    mustChangePassword: (user as any).must_change_password === 1,
  });

  // Session fixation prevention: invalidate all existing sessions before creating new one
  await refreshTokenRepo.deleteAllUserTokens(user.id);

  const refreshToken = await signRefreshToken({ userId: user.id });
  await refreshTokenRepo.createRefreshToken(user.id, refreshToken);

  return {
    user: userRepo.toPublicUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refresh(): Promise<{ accessToken: string; refreshToken: string }> {
  const currentRefreshToken = await getRefreshTokenCookie();
  if (!currentRefreshToken) {
    throw new UnauthorizedError('Refresh token não encontrado');
  }

  // Verificar JWT do refresh token
  let payload;
  try {
    payload = await verifyRefreshToken(currentRefreshToken);
  } catch {
    throw new UnauthorizedError('Refresh token inválido');
  }

  // Verificar se o token existe no banco e nao expirou
  const storedToken = refreshTokenRepo.findValidToken(currentRefreshToken);
  if (!storedToken) {
    throw new UnauthorizedError('Refresh token revogado ou expirado');
  }

  const user = userRepo.getUserById(payload.userId);
  if (!user) {
    throw new UnauthorizedError('Usuário não encontrado');
  }

  // Rotacao: deletar token antigo, criar novo
  await refreshTokenRepo.deleteRefreshToken(currentRefreshToken);

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id ?? '',
    isMasterAdmin: user.is_master_admin === 1,
  });

  const newRefreshToken = await signRefreshToken({ userId: user.id });
  await refreshTokenRepo.createRefreshToken(user.id, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(): Promise<void> {
  const currentRefreshToken = await getRefreshTokenCookie();
  if (currentRefreshToken) {
    await refreshTokenRepo.deleteRefreshToken(currentRefreshToken);
  }
}

export function getMe(userId: string): userRepo.PublicUser | null {
  const user = userRepo.getUserById(userId);
  if (!user) return null;
  return userRepo.toPublicUser(user);
}
