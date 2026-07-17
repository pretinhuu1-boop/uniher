import fs from 'fs';
import path from 'path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useSWR: vi.fn(() => ({ data: undefined, mutate: vi.fn(), isLoading: false })),
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

vi.mock('swr', () => ({ default: mocks.useSWR }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, isLoading: false }),
}));

import AgendaPage from '@/app/(platform)/agenda/page';

describe('Agenda client capability contract', () => {
  beforeEach(() => mocks.useSWR.mockClear());

  it('does not fetch Agenda for ordinary leadership without persisted collaborator capability', () => {
    const html = renderToStaticMarkup(createElement(AgendaPage));

    expect(mocks.useSWR).toHaveBeenCalledWith(null, expect.any(Function), { revalidateOnFocus: false });
    expect(html).toContain('Agenda pessoal indisponível');
  });

  it('never synthesizes also_collaborator from the leadership role in auth hydration', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'hooks', 'useAuth.ts'), 'utf8');

    expect(source).not.toContain("u.also_collaborator || (u.role === 'lideranca' ? 1 : 0)");
    expect(source.match(/also_collaborator: u\.also_collaborator,/g)).toHaveLength(3);
  });
});
