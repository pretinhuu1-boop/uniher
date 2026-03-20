import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookies, clearAuthCookies, getRefreshTokenCookie } from '@/lib/auth/cookies';
import * as userRepo from '@/repositories/user.repository';
import * as companyRepo from '@/repositories/company.repository';
import * as refreshTokenRepo from '@/repositories/refresh-token.repository';
import { ConflictError, UnauthorizedError, ValidationError } from '@/lib/errors';
import type { RegisterInput, LoginInput } from '@/lib/validation/schemas';
import { sanitizeObject } from '@/lib/security/sanitize';

interface AuthResult {
  user: userRepo.PublicUser;
  accessToken: string;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const sanitized = sanitizeObject(input as Record<string, unknown>) as RegisterInput;

  // Verificar se email ja existe
  const existing = userRepo.getUserByEmail(sanitized.email);
  if (existing) {
    throw new ConflictError('Este email já está cadastrado');
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
  });

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id,
  });

  const refreshToken = await signRefreshToken({ userId: user.id });
  await refreshTokenRepo.createRefreshToken(user.id, refreshToken);
  await setAuthCookies(accessToken, refreshToken);

  return {
    user: userRepo.toPublicUser(user),
    accessToken,
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  console.log('[debug-login] Attempt:', input.email);
  const user = userRepo.getUserByEmail(input.email);
  
  if (!user) {
    console.log('[debug-login] User not found:', input.email);
    throw new UnauthorizedError('Email ou senha incorretos');
  }

  console.log('[debug-login] User found:', user.email);
  const valid = await verifyPassword(input.password, user.password_hash);
  
  if (!valid) {
    console.log('[debug-login] Invalid password for:', input.email);
    throw new UnauthorizedError('Email ou senha incorretos');
  }

  console.log('[debug-login] Login successful:', input.email);

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

  // Atualizar last_active
  await userRepo.updateUser(user.id, { lastActive: new Date().toISOString() });

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    companyId: user.company_id,
    mustChangePassword: (user as any).must_change_password === 1,
  });

  const refreshToken = await signRefreshToken({ userId: user.id });
  await refreshTokenRepo.createRefreshToken(user.id, refreshToken);
  await setAuthCookies(accessToken, refreshToken);

  return {
    user: userRepo.toPublicUser(user),
    accessToken,
  };
}

export async function refresh(): Promise<{ accessToken: string }> {
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
    companyId: user.company_id,
  });

  const newRefreshToken = await signRefreshToken({ userId: user.id });
  await refreshTokenRepo.createRefreshToken(user.id, newRefreshToken);
  await setAuthCookies(accessToken, newRefreshToken);

  return { accessToken };
}

export async function logout(): Promise<void> {
  const currentRefreshToken = await getRefreshTokenCookie();
  if (currentRefreshToken) {
    await refreshTokenRepo.deleteRefreshToken(currentRefreshToken);
  }
  await clearAuthCookies();
}

export function getMe(userId: string): userRepo.PublicUser | null {
  const user = userRepo.getUserById(userId);
  if (!user) return null;
  return userRepo.toPublicUser(user);
}
