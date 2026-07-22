// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockUser } from '@/types/platform';

const mocks = vi.hoisted(() => ({
  isLoading: false,
  user: null as MockUser | null,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isLoading: mocks.isLoading, user: mocks.user }),
}));
vi.mock('@/components/community/CommunityFeed', () => ({
  CommunityFeed: () => <div>Feed colaboradora carregado</div>,
}));

import CommunityPage from '@/app/(platform)/comunidade/page';

function user(overrides: Partial<MockUser>): MockUser {
  return {
    id: 'user-a',
    name: 'Usuária',
    email: 'user@example.test',
    role: 'colaboradora',
    joinedAt: '',
    ...overrides,
  };
}

describe('community route collaborator boundary', () => {
  beforeEach(() => {
    mocks.isLoading = false;
    mocks.user = null;
  });
  afterEach(cleanup);

  it.each([
    user({ role: 'colaboradora' }),
    user({ role: 'rh', also_collaborator: 1 }),
  ])('renders the feed for a collaborator-capable user', (authorizedUser) => {
    mocks.user = authorizedUser;
    render(<CommunityPage />);
    expect(screen.getByText('Feed colaboradora carregado')).toBeTruthy();
  });

  it('fails closed for an admin without collaborator capability', () => {
    mocks.user = user({ role: 'admin', also_collaborator: 0 });
    render(<CommunityPage />);
    expect(screen.getByText('Comunidade indisponível para este perfil')).toBeTruthy();
    expect(screen.queryByText('Feed colaboradora carregado')).toBeNull();
  });
});
