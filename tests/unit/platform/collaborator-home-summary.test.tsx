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

    const campaignCard = screen.getByRole('region', { name: /Campanhas da empresa/i });
    expect(within(campaignCard).getByText(/3 de 5 campanhas ativas/i)).not.toBeNull();
    const campaignLink = within(campaignCard).getByRole('link', { name: /Acompanhar campanhas/i });
    expect(campaignLink.getAttribute('href')).toBe('/campanhas');
    expect(campaignCard.textContent).not.toMatch(/\b(?:XP|ranking|pontos?)\b/i);
  });

  it('renders private journey links instead of a legacy gamification review banner', () => {
    render(<CollaboratorHomePage />);

    expect(screen.getByRole('heading', { name: /Jornada privada/i })).not.toBeNull();
    expect(screen.getByRole('link', { name: /Abrir objetivos/i }).getAttribute('href')).toBe('/objetivos');
    expect(screen.getByRole('link', { name: /Abrir desafios/i }).getAttribute('href')).toBe('/desafios');
    expect(screen.getByRole('link', { name: /Abrir conquistas/i }).getAttribute('href')).toBe('/conquistas');
    expect(screen.queryByText(/Pontua/i)).toBeNull();
    expect(screen.queryByText(/classifica/i)).toBeNull();
    expect(screen.queryByText(/em revis/i)).toBeNull();
  });
});
