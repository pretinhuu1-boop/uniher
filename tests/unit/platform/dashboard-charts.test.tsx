import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AgeOverview } from '@/app/(platform)/dashboard/components/AgeOverview';
import { EngagementOverview } from '@/app/(platform)/dashboard/components/EngagementOverview';
import { SUPPRESSION_MESSAGE } from '@/types/privacy';

describe('RH protected dashboard accessibility', () => {
  it('removes the legacy engagement chart and renders only the protected message', () => {
    const html = renderToStaticMarkup(createElement(EngagementOverview, {
      metric: { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
    }));

    expect(html).toContain(`role="status">${SUPPRESSION_MESSAGE}`);
    expect(html).toContain('Participação');
    expect(html).not.toContain('<canvas');
    expect(html).not.toMatch(/\\u[0-9a-f]{4}/i);
    expect(html).not.toMatch(/72%|reten\u00e7\u00e3o/i);
  });

  it('renders a protected visible age count without a percentage denominator', () => {
    const html = renderToStaticMarkup(createElement(AgeOverview, {
      data: [{ label: '26-35', color: '#536444', metric: { status: 'visible', value: 12 } }],
    }));

    expect(html).toContain('26-35');
    expect(html).toContain('Distribuição');
    expect(html).toContain('Faixas etárias protegidas');
    expect(html).toContain('<strong>12</strong>');
    expect(html).not.toContain('%');
    expect(html).not.toContain('<canvas');
    expect(html).not.toMatch(/\\u[0-9a-f]{4}/i);
  });
});
