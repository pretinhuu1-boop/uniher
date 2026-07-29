// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  swrDataByKey: new Map<string, unknown>(),
  searchParams: '',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mocks.searchParams),
}));

vi.mock('swr', () => ({
  default: (key: string) => ({
    data: mocks.swrDataByKey.get(key),
    isLoading: false,
    mutate: vi.fn(),
  }),
}));

vi.mock('@/components/gamification/DailyLesson', () => ({
  default: () => <div data-testid="daily-lesson" />,
}));

import CollaboratorHomePage from '@/app/(platform)/colaboradora/page';

describe('Collaborator home summary parity', () => {
  beforeEach(() => {
    mocks.searchParams = '';
    mocks.swrDataByKey.clear();
    mocks.swrDataByKey.set('/api/collaborator', {
      greeting: 'Bom dia',
      userName: 'Ana',
      contentViewed: 12,
      examsPercent: 80,
      campaignsActive: 3,
      campaignsTotal: 5,
    });
    mocks.swrDataByKey.set('/api/company/modules', { modules: [] });
    mocks.swrDataByKey.set('/api/gamification/streak-status', {
      checkedInToday: false,
      checkedOutToday: false,
    });
    mocks.swrDataByKey.set('/api/gamification/daily-missions', { missions: [] });
  });

  afterEach(cleanup);

  it('renders the non-gamified campaign summary card from collaborator home data', () => {
    render(<CollaboratorHomePage />);

    const summary = screen.getByLabelText('Resumo da jornada');
    expect(within(summary).getByText('Campanhas')).not.toBeNull();
    expect(within(summary).getByText('3')).not.toBeNull();
    expect(within(summary).getByText('de 5')).not.toBeNull();
    expect(summary.textContent).not.toMatch(/\b(?:XP|ranking|pontos?)\b/i);
  });
});
