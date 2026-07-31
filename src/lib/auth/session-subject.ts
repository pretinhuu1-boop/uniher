import * as companyRepo from '@/repositories/company.repository';
import * as userRepo from '@/repositories/user.repository';
import { UnauthorizedError } from '@/lib/errors';

export interface ActiveSessionSubject {
  user: userRepo.UserRow;
  auth: {
    userId: string;
    role: string;
    companyId: string;
    isMasterAdmin: boolean;
    mustChangePassword: boolean;
    passwordResetRequired: boolean;
  };
}

function rejectRevokedSession(): never {
  throw new UnauthorizedError('Sessao revogada');
}

function isRevokedUser(user: userRepo.UserRow): boolean {
  return Boolean(user.deleted_at)
    || user.blocked === 1
    || user.approved === 0;
}

function isInactiveCompany(company: companyRepo.CompanyRow | undefined): boolean {
  return !company
    || Boolean(company.deleted_at)
    || company.is_active !== 1;
}

export function getActiveSessionSubject(userId: string): ActiveSessionSubject {
  const user = userRepo.getUserById(userId);
  if (!user || isRevokedUser(user)) {
    rejectRevokedSession();
  }

  if (user.company_id) {
    const company = companyRepo.getCompanyById(user.company_id);
    if (isInactiveCompany(company)) {
      rejectRevokedSession();
    }
  }

  return {
    user,
    auth: {
      userId: user.id,
      role: user.role,
      companyId: user.company_id ?? '',
      isMasterAdmin: user.is_master_admin === 1,
      mustChangePassword: user.must_change_password === 1,
      passwordResetRequired: user.password_reset_required === 1,
    },
  };
}
