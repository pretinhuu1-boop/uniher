// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/comunidade',
  user: {
    role: 'colaboradora',
    also_collaborator: 0,
  } as { role: 'admin' | 'rh' | 'lideranca' | 'colaboradora'; also_collaborator: number },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isLoading: false, user: mocks.user }),
}));
vi.mock('@/components/platform/Sidebar', () => ({ default: () => <aside aria-label="Sidebar test" /> }));
vi.mock('@/components/platform/ReminderPopup', () => ({ default: () => null }));
vi.mock('@/components/ui/ScrollToTop', () => ({ ScrollToTop: () => null }));

import AppLayout from '@/components/platform/AppLayout';
import MobileBottomNav, { isCommunityManagementPath } from '@/components/platform/MobileBottomNav';

function renderLayout() {
  return render(<AppLayout><div>Conteúdo</div></AppLayout>);
}

function expectReservedMobilePadding(expected: boolean) {
  const workspaceClass = screen.getByRole('main').parentElement?.className ?? '';
  expect(workspaceClass.includes('workspaceWithMobileNav')).toBe(expected);
}

describe('mobile community navigation boundary', () => {
  beforeEach(() => {
    mocks.pathname = '/comunidade';
    mocks.user.role = 'colaboradora';
    mocks.user.also_collaborator = 0;
  });

  afterEach(cleanup);

  it('matches management paths by segment without browser globals', () => {
    expect(isCommunityManagementPath(null)).toBe(false);
    expect(isCommunityManagementPath(undefined)).toBe(false);
    expect(isCommunityManagementPath('/comunidade')).toBe(false);
    expect(isCommunityManagementPath('/comunidade/gerenciar')).toBe(true);
    expect(isCommunityManagementPath('/comunidade/gerenciar/post-a')).toBe(true);
    expect(isCommunityManagementPath('/comunidade/gerenciar-outro')).toBe(false);
  });

  it('keeps the personal community destination active for collaborators', () => {
    renderLayout();

    const navigation = screen.getByRole('navigation', { name: 'Navegação mobile' });
    expect(navigation.querySelector('a[href="/comunidade"]')?.getAttribute('aria-current')).toBe('page');
    expectReservedMobilePadding(true);
  });

  it('keeps the personal community nav for a dual-role user on the feed', () => {
    mocks.user.role = 'rh';
    mocks.user.also_collaborator = 1;

    renderLayout();

    expect(screen.queryByRole('navigation', { name: 'Navegação mobile' })).not.toBeNull();
    expectReservedMobilePadding(true);
  });

  it.each(['/comunidade/gerenciar', '/comunidade/gerenciar/post-a'])(
    'hides personal nav and reserved padding from dual-role management route %s',
    (pathname) => {
      mocks.pathname = pathname;
      mocks.user.role = 'rh';
      mocks.user.also_collaborator = 1;

      renderLayout();

      expect(screen.queryByRole('navigation', { name: 'Navegação mobile' })).toBeNull();
      expectReservedMobilePadding(false);
    },
  );

  it.each(['rh', 'admin'] as const)('does not render personal nav or padding for %s management', (role) => {
    mocks.pathname = '/comunidade/gerenciar';
    mocks.user.role = role;

    renderLayout();

    expect(screen.queryByRole('navigation', { name: 'Navegação mobile' })).toBeNull();
    expectReservedMobilePadding(false);
  });

  it('never marks Comunidade active when the bottom nav is evaluated on a management route', () => {
    mocks.pathname = '/comunidade/gerenciar/post-a';

    render(<MobileBottomNav />);

    expect(screen.getByRole('link', { name: 'Comunidade' }).getAttribute('aria-current')).toBeNull();
  });
});
