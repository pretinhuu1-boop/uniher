import { createElement, Fragment, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/AvatarBadge';
import { PageHeader } from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

function classNameFrom(html: string) {
  return html.match(/class="([^"]+)"/)?.[1];
}

describe('Button', () => {
  it('exposes loading state and prevents repeat submission', () => {
    const html = render(createElement(Button, { isLoading: true }, 'Salvar'));

    expect(html).toContain('disabled=""');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Salvando…');
    expect(html).not.toContain('>Salvar<');
  });

  it('keeps semantic variants, compatibility aliases, focus, and minimum target size coherent', () => {
    const renderVariant = (variant: Parameters<typeof Button>[0]['variant']) =>
      render(createElement(Button, { variant }, variant));
    const primary = renderVariant('primary');
    const secondary = renderVariant('secondary');

    expect(classNameFrom(renderVariant('gold'))).toBe(classNameFrom(primary));
    expect(classNameFrom(renderVariant('outline'))).toBe(classNameFrom(secondary));
    expect(renderVariant('danger')).toContain('var(--platform-critical)');
    expect(primary).toContain('min-h-11');
    expect(primary).toContain('min-w-11');
    expect(primary).toContain('focus-visible:ring-[var(--platform-action)]');
    expect(primary).not.toMatch(/shadow|active:scale/);
  });
});

describe('Input', () => {
  it('associates both description and error with a stable input id', () => {
    const html = render(createElement(Input, {
      label: 'E-mail',
      description: 'Use seu e-mail corporativo.',
      error: 'E-mail inválido.',
    }));
    const inputId = html.match(/<input[^>]*\sid="([^"]+)"/)?.[1];
    const describedBy = html.match(/<input[^>]+aria-describedby="([^"]+)"/)?.[1]?.split(' ');

    expect(inputId).toBeTruthy();
    expect(html).toContain('aria-invalid="true"');
    expect(describedBy).toEqual([`${inputId}-description`, `${inputId}-error`]);
    expect(html).toContain(`id="${inputId}-description"`);
    expect(html).toContain(`id="${inputId}-error"`);
  });
});

describe('FeedbackState', () => {
  it.each([
    ['loading', 'status'],
    ['empty', 'status'],
    ['error', 'alert'],
    ['denied', 'alert'],
  ] as const)('uses the correct live-region role for %s', (kind, role) => {
    const html = render(createElement(FeedbackState, {
      kind,
      title: `Estado ${kind}`,
      description: 'Descrição orientadora.',
      action: createElement('button', null, 'Continuar'),
    }));

    expect(html).toContain(`role="${role}"`);
    expect(html).not.toContain(`role="${role === 'alert' ? 'status' : 'alert'}"`);
  });
});

describe('PageHeader', () => {
  it('renders one h1 and separates primary from secondary actions', () => {
    const html = render(createElement(PageHeader, {
      context: 'Pessoas',
      title: 'Colaboradoras',
      description: 'Acompanhe entradas e pendências.',
      primaryAction: createElement('button', null, 'Convidar'),
      secondaryActions: createElement(Fragment, null,
        createElement('button', null, 'Exportar'),
        createElement('button', null, 'Filtrar'),
      ),
    }));

    expect(html.match(/<h1(?:\s|>)/g)).toHaveLength(1);
    expect(html).toContain('role="group" aria-label="Ação principal"');
    expect(html).toContain('data-action-region="primary"');
    expect(html).toContain('role="group" aria-label="Ações secundárias"');
    expect(html).toContain('data-action-region="secondary"');
  });
});

describe('SummaryBand', () => {
  it('renders a labeled definition list with every semantic state', () => {
    const html = render(createElement(SummaryBand, {
      label: 'Resumo operacional',
      items: [
        { label: 'Total', value: 24, state: 'neutral' },
        { label: 'Ativas', value: 18, detail: '75%', state: 'positive' },
        { label: 'Atenção', value: 4, state: 'warning' },
        { label: 'Críticas', value: 2, state: 'critical' },
      ],
    }));

    expect(html).toContain('<section aria-label="Resumo operacional"');
    expect(html).toContain('<dl');
    for (const state of ['neutral', 'positive', 'warning', 'critical']) {
      expect(html).toContain(`data-state="${state}"`);
    }
    expect(html).not.toMatch(/<article|shadow/);
  });
});

describe('Skeleton', () => {
  it('is decorative and uses the shared grouping token', () => {
    const html = render(createElement(Skeleton));

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('bg-[var(--platform-group)]');
  });
});

describe('Badge', () => {
  it.each(['neutral', 'positive', 'warning', 'critical', 'info'] as const)(
    'renders canonical %s state with semantic platform tokens and original casing',
    (variant) => {
      const html = render(createElement(Badge, { variant, size: 'sm' }, 'Em análise'));

      expect(html).toContain(`data-variant="${variant}"`);
      expect(html).toContain('var(--platform-');
      expect(html).not.toContain('uppercase');
      expect(html).toContain('Em análise');
    },
  );

  it('keeps legacy consumer aliases renderable without obscuring the canonical state', () => {
    expect(render(createElement(Badge, { variant: 'alert' }, 'Alerta'))).toContain('data-variant="critical"');
    expect(render(createElement(Badge, { variant: 'success' }, 'Ativa'))).toContain('data-variant="positive"');
  });
});
