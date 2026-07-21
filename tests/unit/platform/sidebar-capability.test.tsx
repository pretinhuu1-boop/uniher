// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRole } from '@/types/platform';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  clearProtectedReportCaches: vi.fn<() => Promise<void>>(),
  swrKeys: [] as unknown[],
  hasUser: true,
  user: {
    id: 'leadership-common',
    companyId: 'company-a' as string | undefined,
    name: 'Liderança comum',
    email: 'leader@example.test',
    role: 'lideranca' as UserRole,
    isMasterAdmin: false,
    also_collaborator: 0,
    level: 0,
    points: 0,
    streak: 0,
    joinedAt: '',
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/lideranca',
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock('next/image', () => ({
  default: ({ priority: _priority, ...props }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => (
    <img {...props} />
  ),
}));
vi.mock('swr', () => ({
  default: (key: unknown) => {
    mocks.swrKeys.push(key);
    return { data: undefined };
  },
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.hasUser ? mocks.user : null, logout: vi.fn() }),
  clearProtectedReportCaches: mocks.clearProtectedReportCaches,
}));

import Sidebar from '@/components/platform/Sidebar';

describe('Sidebar persisted collaborator capability', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.push.mockReset();
    mocks.clearProtectedReportCaches.mockReset();
    mocks.clearProtectedReportCaches.mockResolvedValue();
    mocks.swrKeys.length = 0;
    mocks.hasUser = true;
    mocks.user.id = 'leadership-common';
    mocks.user.role = 'lideranca';
    mocks.user.isMasterAdmin = false;
    mocks.user.also_collaborator = 0;
    mocks.user.companyId = 'company-a';
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(cleanup);

  it('does not render Agenda for leadership without persisted collaborator capability', () => {
    sessionStorage.setItem('uniher-view-mode', 'colaboradora');

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('link', { name: /Minha agenda/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Colaboradora' })).toBeNull();
  });

  it('renders Agenda only in the personal view for a persisted dual-role user', async () => {
    mocks.user.role = 'rh';
    mocks.user.also_collaborator = 1;
    sessionStorage.setItem('uniher-view-mode', 'colaboradora');

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.queryByRole('link', { name: /Minha agenda/i })).not.toBeNull());
    expect(screen.queryByRole('link', { name: /^Comunidade$/i })).not.toBeNull();
    expect(screen.queryByRole('link', { name: /Gerenciar comunidade/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /Visão geral/i })).toBeNull();
  });

  it('keeps community management in the RH view for a dual-role user', () => {
    mocks.user.role = 'rh';
    mocks.user.also_collaborator = 1;

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('link', { name: /Gerenciar comunidade/i })).not.toBeNull();
    expect(screen.queryByRole('link', { name: /^Comunidade$/i })).toBeNull();
  });

  it.each([
    { label: 'collaborator', role: 'colaboradora' as const, isMasterAdmin: false, feed: true, manage: false },
    { label: 'RH', role: 'rh' as const, isMasterAdmin: false, feed: false, manage: true },
    { label: 'company admin', role: 'admin' as const, isMasterAdmin: false, feed: false, manage: true },
    { label: 'master admin', role: 'admin' as const, isMasterAdmin: true, feed: false, manage: true },
    { label: 'leadership', role: 'lideranca' as const, isMasterAdmin: false, feed: false, manage: false },
  ])('renders the desktop community links for $label only', ({ role, isMasterAdmin, feed, manage }) => {
    mocks.user.role = role;
    mocks.user.isMasterAdmin = isMasterAdmin;

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole('link', { name: /^Comunidade$/i }) !== null).toBe(feed);
    expect(screen.queryByRole('link', { name: /Gerenciar comunidade/i }) !== null).toBe(manage);
  });

  it('clears protected report caches before switching the persisted view', async () => {
    mocks.user.also_collaborator = 1;
    let releaseCacheClear: (() => void) | undefined;
    mocks.clearProtectedReportCaches.mockReturnValue(new Promise<void>((resolve) => {
      releaseCacheClear = resolve;
    }));

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Colaboradora' }));

    expect(mocks.clearProtectedReportCaches).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('uniher-view-mode')).toBeNull();

    releaseCacheClear?.();
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/colaboradora'));
    expect(sessionStorage.getItem('uniher-view-mode')).toBe('colaboradora');
  });

  it('does not purge caches or navigate when the selected view is already active', () => {
    mocks.user.also_collaborator = 1;

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Lideran/i }));

    expect(mocks.clearProtectedReportCaches).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('scopes the company SWR key to the authenticated tenant and role', () => {
    const { rerender } = render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    const companyAKey = mocks.swrKeys.find(key => Array.isArray(key) && key[0] === '/api/company');
    expect(companyAKey).toEqual(['/api/company', 'company-a', 'lideranca']);

    mocks.swrKeys.length = 0;
    mocks.user.companyId = 'company-b';
    rerender(<Sidebar isOpen={false} onClose={vi.fn()} />);

    const companyBKey = mocks.swrKeys.find(key => Array.isArray(key) && key[0] === '/api/company');
    expect(companyBKey).toEqual(['/api/company', 'company-b', 'lideranca']);
    expect(companyBKey).not.toEqual(companyAKey);
  });

  it('does not request company data before the authenticated tenant is known', () => {
    mocks.user.companyId = undefined;

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    expect(mocks.swrKeys[0]).toBeNull();
  });

  it('scopes notification count by user, tenant and authenticated role', () => {
    const { rerender } = render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    const notificationAKey = mocks.swrKeys.find(
      key => Array.isArray(key) && key[0] === '/api/notifications/count',
    );
    expect(notificationAKey).toEqual([
      '/api/notifications/count',
      'leadership-common',
      'company-a',
      'lideranca',
    ]);

    mocks.swrKeys.length = 0;
    mocks.user.id = 'leadership-other';
    mocks.user.companyId = 'company-b';
    rerender(<Sidebar isOpen={false} onClose={vi.fn()} />);

    const notificationBKey = mocks.swrKeys.find(
      key => Array.isArray(key) && key[0] === '/api/notifications/count',
    );
    expect(notificationBKey).toEqual([
      '/api/notifications/count',
      'leadership-other',
      'company-b',
      'lideranca',
    ]);
    expect(notificationBKey).not.toEqual(notificationAKey);
  });

  it('does not request notification count without a user and uses null tenant in a user-scoped key', () => {
    mocks.user.companyId = undefined;
    const { unmount } = render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    expect(mocks.swrKeys).toContainEqual([
      '/api/notifications/count',
      'leadership-common',
      null,
      'lideranca',
    ]);

    unmount();
    mocks.swrKeys.length = 0;
    mocks.hasUser = false;
    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    expect(mocks.swrKeys).toEqual([null, null]);
  });
});
