import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  return {
    Doughnut: () => React.createElement('canvas', { 'data-chart': 'doughnut' }),
    Line: () => React.createElement('canvas', { 'data-chart': 'line' }),
  };
});

import { AgeOverview } from '@/app/(platform)/dashboard/components/AgeOverview';
import { EngagementOverview } from '@/app/(platform)/dashboard/components/EngagementOverview';

describe('RH dashboard chart accessibility', () => {
  it('labels the engagement visualization and exposes the same data in a semantic table', () => {
    const html = renderToStaticMarkup(createElement(EngagementOverview, {
      data: [{ month: 'Jul', engagement: 72, retention: 66 }],
    }));

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Gráfico de engajamento e retenção por mês"');
    expect(html).toContain('<table');
    expect(html).toContain('<caption>Dados mensais de engajamento e retenção</caption>');
    expect(html).toContain('<th scope="col">Mês</th>');
    expect(html).toContain('<td>Jul</td>');
    expect(html).toContain('<td>72%</td>');
    expect(html).toContain('<td>66%</td>');
  });

  it('gives the age distribution visualization a clear accessible name', () => {
    const html = renderToStaticMarkup(createElement(AgeOverview, {
      data: [{ label: '26-35', percent: 100, color: '#536444' }],
    }));

    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Distribuição percentual por faixa etária"');
  });
});
