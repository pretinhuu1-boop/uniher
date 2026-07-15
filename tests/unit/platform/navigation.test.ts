import { describe, expect, it } from 'vitest';
import { getNavigationForRole, getRoleHome } from '@/components/platform/navigation';
import type { UserRole } from '@/types/platform';

const roles: UserRole[] = ['admin', 'rh', 'lideranca', 'colaboradora'];

describe('platform navigation', () => {
  it('groups RH routes by user intent', () => {
    const groups = getNavigationForRole('rh');
    expect(groups.map((group) => group.label)).toEqual([
      'Visão geral',
      'Pessoas e cuidado',
      'Engajamento',
      'Gestão',
    ]);
    const routes = groups.flatMap((group) => group.items.map((item) => item.href));
    expect(routes).toContain('/dashboard');
    expect(routes).toContain('/convites');
  });

  it('keeps collaborator and admin destinations isolated', () => {
    const collaboratorRoutes = getNavigationForRole('colaboradora').flatMap((group) => group.items.map((item) => item.href));
    const adminRoutes = getNavigationForRole('admin').flatMap((group) => group.items.map((item) => item.href));
    expect(collaboratorRoutes).not.toContain('/admin');
    expect(adminRoutes).not.toContain('/colaboradora');
  });

  it('returns the correct profile home', () => {
    expect(getRoleHome('admin')).toBe('/admin');
    expect(getRoleHome('rh')).toBe('/dashboard');
    expect(getRoleHome('lideranca')).toBe('/dashboard');
    expect(getRoleHome('colaboradora')).toBe('/colaboradora');
  });

  it('falls back to collaborator navigation for an unexpected runtime role', () => {
    expect(getNavigationForRole('unexpected' as UserRole)).toEqual(getNavigationForRole('colaboradora'));
  });

  it.each(roles)('does not define duplicate routes for %s', (role) => {
    const routes = getNavigationForRole(role).flatMap((group) => group.items.map((item) => item.href));
    expect(new Set(routes).size).toBe(routes.length);
  });
});
