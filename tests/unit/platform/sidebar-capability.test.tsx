// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  clearProtectedReportCaches: vi.fn<() => Promise<void>>(),
  user: {
    id: 'leadership-common',
    name: 'Liderança comum',
    email: 'leader@example.test',
    role: 'lideranca' as const,
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
vi.mock('swr', () => ({ default: () => ({ data: undefined }) }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, logout: vi.fn() }),
  clearProtectedReportCaches: mocks.clearProtectedReportCaches,
}));

import Sidebar from '@/components/platform/Sidebar';

describe('Sidebar persisted collaborator capability', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.push.mockReset();
    mocks.clearProtectedReportCaches.mockReset();
    mocks.clearProtectedReportCaches.mockResolvedValue();
    mocks.user.also_collaborator = 0;
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
    mocks.user.also_collaborator = 1;
    sessionStorage.setItem('uniher-view-mode', 'colaboradora');

    render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    await waitFor(() => expect(screen.queryByRole('link', { name: /Minha agenda/i })).not.toBeNull());
    expect(screen.queryByRole('link', { name: /Visão geral/i })).toBeNull();
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
});
