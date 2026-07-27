import * as companyRepo from '@/repositories/company.repository';
import * as userRepo from '@/repositories/user.repository';
import { UnauthorizedError } from '@/lib/errors';

type PersistedUser = userRepo.UserRow & {
  deleted_at?: string | null;
};

type PersistedCompany = companyRepo.CompanyRow & {
  deleted_at?: string | null;
};

export interface ActiveSessionSubject {
  user: PersistedUser;
  auth: {
    userId: string;
    role: string;
    companyId: string;
    isMasterAdmin: boolean;
    mustChangePassword: boolean;
  };
}

function rejectRevokedSession(): never {
  throw new UnauthorizedError('Sessao revogada');
}

function isRevokedUser(user: PersistedUser): boolean {
  return Boolean(user.deleted_at)
    || user.blocked === 1
    || user.approved === 0;
}

function isInactiveCompany(company: PersistedCompany | undefined): boolean {
  return !company
    || Boolean(company.deleted_at)
    || Number(company.is_active ?? 1) !== 1;
}

export function getActiveSessionSubject(userId: string): ActiveSessionSubject {
  const user = userRepo.getUserById(userId) as PersistedUser | undefined;
  if (!user || isRevokedUser(user)) {
    rejectRevokedSession();
  }

  if (user.company_id) {
    const company = companyRepo.getCompanyById(user.company_id) as PersistedCompany | undefined;
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
    },
  };
}
