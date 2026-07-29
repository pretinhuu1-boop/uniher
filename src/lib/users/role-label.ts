import type { UserRole } from '@/types/platform';

const USER_ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  admin: 'Admin Master',
  rh: 'Admin Empresa',
  lideranca: 'Liderança',
  colaboradora: 'Colaboradora',
};

export function getUserRoleLabel(role: UserRole | string | null | undefined): string {
  if (!role) return 'Colaboradora';
  return USER_ROLE_LABELS[role as UserRole] ?? role;
}
