import { createElement, Fragment, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeedbackState } from '@/components/ui/FeedbackState';
import type { FeedbackStateProps } from '@/components/ui/FeedbackState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/AvatarBadge';
import { PageHeader } from '@/components/platform/PageHeader';
import * as PageHeaderModule from '@/components/platform/PageHeader';
import { SummaryBand } from '@/components/platform/SummaryBand';
import type { SummaryBandProps, SummaryItem } from '@/components/platform/SummaryBand';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type Expect<Value extends true> = Value;
type _RequiredFeedbackDescription = Expect<Equal<FeedbackStateProps['description'], string>>;
type _SummaryValueContract = Expect<Equal<SummaryItem['value'], string | number>>;
type _SummaryItemsContract = Expect<Equal<SummaryBandProps['items'], SummaryItem[]>>;

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

interface StructuralElement {
  tag: string;
  attributes: Record<string, string>;
  innerHTML: string;
  outerHTML: string;
  start: number;
}

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function attributesFrom(openingTag: string) {
  const attributes: Record<string, string> = {};
  const attributeSource = openingTag
    .replace(/^<[a-z][a-z0-9-]*/i, '')
    .replace(/\/?>$/, '');
  const attributePattern = /([^\s=]+)(?:="([^"]*)")?/g;

  for (const match of attributeSource.matchAll(attributePattern)) {
    attributes[match[1]] = match[2] ?? '';
  }

  return attributes;
}

function elementsFrom(html: string, requestedTag?: string): StructuralElement[] {
  const elements: StructuralElement[] = [];
  const stack: Array<{
    tag: string;
    attributes: Record<string, string>;
    openingTag: string;
    start: number;
    innerStart: number;
  }> = [];
  const tagPattern = /<\/?([a-z][a-z0-9-]*)(?:\s[^<>]*?)?\s*\/?>/gi;

  for (const match of html.matchAll(tagPattern)) {
    const token = match[0];
    const tag = match[1].toLowerCase();
    const start = match.index;

    if (token.startsWith('</')) {
      const opening = stack.pop();
      if (!opening || opening.tag !== tag) {
        throw new Error(`Malformed SSR markup near ${token}`);
      }

      elements.push({
        tag,
        attributes: opening.attributes,
        innerHTML: html.slice(opening.innerStart, start),
        outerHTML: html.slice(opening.start, start + token.length),
        start: opening.start,
      });
      continue;
    }

    if (token.endsWith('/>') || VOID_ELEMENTS.has(tag)) {
      elements.push({
        tag,
        attributes: attributesFrom(token),
        innerHTML: '',
        outerHTML: token,
        start,
      });
      continue;
    }

    stack.push({
      tag,
      attributes: attributesFrom(token),
      openingTag: token,
      start,
      innerStart: start + token.length,
    });
  }

  if (stack.length > 0) {
    throw new Error(`Unclosed SSR element: ${stack.at(-1)?.openingTag}`);
  }

  return elements
    .filter((element) => !requestedTag || element.tag === requestedTag)
    .sort((left, right) => left.start - right.start);
}

function elementWithAttribute(
  html: string,
  attribute: string,
  value?: string,
  tag?: string,
) {
  return elementsFrom(html, tag).find((element) =>
    Object.hasOwn(element.attributes, attribute)
    && (value === undefined || element.attributes[attribute] === value));
}

function textFrom(element: StructuralElement) {
  return element.innerHTML.replace(/<[^>]+>/g, '');
}

function classNameFrom(html: string) {
  return elementsFrom(html)[0]?.attributes.class;
}

describe('Button', () => {
  it('exposes loading state and prevents repeat submission', () => {
    const html = render(createElement(Button, { isLoading: true }, 'Salvar'));
    const button = elementsFrom(html, 'button')[0];

    expect(button.attributes.disabled).toBe('');
    expect(button.attributes['aria-busy']).toBe('true');
    expect(textFrom(button)).toBe('Salvando…');
  });

  it('preserves caller busy state while idle and forces busy state while loading', () => {
    const idle = elementsFrom(render(createElement(Button, { 'aria-busy': true }, 'Salvar')), 'button')[0];
    const loading = elementsFrom(render(createElement(Button, {
      'aria-busy': false,
      isLoading: true,
    }, 'Salvar')), 'button')[0];

    expect(idle.attributes['aria-busy']).toBe('true');
    expect(loading.attributes['aria-busy']).toBe('true');
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
    expect(primary).toContain('hover:text-[var(--platform-shell-text)]');
    expect(primary).not.toMatch(/shadow|active:scale/);
  });
});

describe('Input', () => {
  it('associates an explicit input id with its label, description, and error', () => {
    const html = render(createElement(Input, {
      id: 'account-email',
      label: 'E-mail',
      description: 'Use seu e-mail corporativo.',
      error: 'E-mail inválido.',
    }));
    const input = elementsFrom(html, 'input')[0];
    const label = elementsFrom(html, 'label')[0];
    const description = elementWithAttribute(html, 'id', 'account-email-description', 'p');
    const error = elementWithAttribute(html, 'id', 'account-email-error', 'p');

    expect(input.attributes.id).toBe('account-email');
    expect(input.attributes['aria-invalid']).toBe('true');
    expect(input.attributes['aria-describedby'].split(' ')).toEqual([
      'account-email-description',
      'account-email-error',
    ]);
    expect(label.attributes.for).toBe('account-email');
    expect(textFrom(description!)).toBe('Use seu e-mail corporativo.');
    expect(textFrom(error!)).toBe('E-mail inválido.');
  });

  it('generates unique ids for multiple inputs in the same render', () => {
    const html = render(createElement(Fragment, null,
      createElement(Input, { label: 'Nome' }),
      createElement(Input, { label: 'E-mail' }),
    ));
    const inputs = elementsFrom(html, 'input');
    const labels = elementsFrom(html, 'label');
    const ids = inputs.map((input) => input.attributes.id);

    expect(inputs).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(labels.map((label) => label.attributes.for)).toEqual(ids);
  });

  it('retains the forwarded-ref component contract in the Node test environment', () => {
    expect((Input as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.forward_ref'));
  });
});

describe('FeedbackState', () => {
  it.each([
    ['loading', 'status'],
    ['empty', 'status'],
    ['error', 'alert'],
    ['denied', 'alert'],
  ] as const)('uses the correct live-region role for %s', (kind, role) => {
    const title = `Estado ${kind}`;
    const description = 'Descrição orientadora.';
    const html = render(createElement(FeedbackState, {
      kind,
      title,
      description,
      action: createElement('button', null, 'Continuar'),
    }));
    const section = elementsFrom(html, 'section')[0];
    const announcement = elementWithAttribute(html, 'role', role);
    const refreshedContent = elementWithAttribute(html, 'data-feedback-content');

    expect(elementsFrom(html).filter((element) => element.attributes.role)).toHaveLength(1);
    expect(announcement).toBeTruthy();
    expect(announcement?.attributes['aria-busy']).toBeUndefined();
    expect(textFrom(announcement!)).toContain(title);
    expect(textFrom(announcement!)).toContain(description);
    expect(textFrom(announcement!)).not.toContain('Continuar');
    expect(refreshedContent).toBeTruthy();
    expect(section.innerHTML).toContain(refreshedContent?.outerHTML);
    expect(textFrom(refreshedContent!)).toBe('Continuar');
    expect(refreshedContent?.attributes['aria-busy']).toBe(kind === 'loading' ? 'true' : undefined);
  });
});

describe('PageHeader', () => {
  it('provides the canonical default and named exports', () => {
    expect(PageHeaderModule.default).toBe(PageHeaderModule.PageHeader);
  });

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
    const header = elementsFrom(html, 'header')[0];
    const headings = elementsFrom(header.innerHTML, 'h1');
    const primary = elementWithAttribute(header.innerHTML, 'data-action-region', 'primary');
    const secondary = elementWithAttribute(header.innerHTML, 'data-action-region', 'secondary');

    expect(headings).toHaveLength(1);
    expect(textFrom(headings[0])).toBe('Colaboradoras');
    expect(textFrom(header)).toContain('Pessoas');
    expect(textFrom(header)).toContain('Acompanhe entradas e pendências.');
    expect(primary?.attributes.role).toBe('group');
    expect(primary?.attributes['aria-label']).toBe('Ação principal');
    expect(elementsFrom(primary!.innerHTML, 'button').map(textFrom)).toEqual(['Convidar']);
    expect(secondary?.attributes.role).toBe('group');
    expect(secondary?.attributes['aria-label']).toBe('Ações secundárias');
    expect(elementsFrom(secondary!.innerHTML, 'button').map(textFrom)).toEqual(['Exportar', 'Filtrar']);
  });
});

describe('SummaryBand', () => {
  it('renders a labeled definition list with every semantic state', () => {
    const items = [
      { label: 'Total', value: 24, state: 'neutral' },
      { label: 'Ativas', value: 18, detail: '75%', state: 'positive' },
      { label: 'Atenção', value: 4, state: 'warning' },
      { label: 'Críticas', value: 2, state: 'critical' },
    ] as const;
    const html = render(createElement(SummaryBand, {
      label: 'Resumo operacional',
      items: [...items],
    }));
    const section = elementsFrom(html, 'section')[0];
    const definitionLists = elementsFrom(section.innerHTML, 'dl');
    const definitionList = definitionLists[0];
    const renderedItems = elementsFrom(definitionList.innerHTML, 'div')
      .filter((element) => Object.hasOwn(element.attributes, 'data-state'));

    expect(section.attributes['aria-label']).toBe('Resumo operacional');
    expect(definitionLists).toHaveLength(1);
    expect(definitionList.attributes.class).toContain('gap-3');
    expect(definitionList.attributes.class).not.toMatch(/divide-x|divide-y/);
    expect(renderedItems).toHaveLength(items.length);
    items.forEach((item, index) => {
      const renderedItem = renderedItems[index];
      const terms = elementsFrom(renderedItem.innerHTML, 'dt');
      const definitions = elementsFrom(renderedItem.innerHTML, 'dd');

      expect(renderedItem.attributes['data-state']).toBe(item.state);
      expect(terms).toHaveLength(1);
      expect(definitions).toHaveLength(1);
      expect(textFrom(terms[0])).toBe(item.label);
      expect(textFrom(definitions[0])).toBe(`${item.value}${'detail' in item ? item.detail : ''}`);
      if (item.state === 'warning') {
        expect(definitions[0].attributes.class).toContain('text-[var(--platform-ink)]');
      }
    });
    expect(elementsFrom(section.innerHTML, 'article')).toHaveLength(0);
    expect(section.attributes.class).not.toContain('shadow');
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
      const badge = elementsFrom(html, 'span')[0];

      expect(badge.attributes['data-variant']).toBe(variant);
      expect(badge.attributes.class).toContain('var(--platform-');
      expect(badge.attributes.class).not.toContain('uppercase');
      expect(textFrom(badge)).toBe('Em análise');
    },
  );

  it.each([
    ['alert', 'critical'],
    ['success', 'positive'],
    ['secondary', 'neutral'],
    ['outline', 'neutral'],
  ] as const)('maps legacy %s consumers to canonical %s state', (legacy, canonical) => {
    const badge = elementsFrom(render(createElement(Badge, { variant: legacy }, legacy)), 'span')[0];

    expect(badge.attributes['data-variant']).toBe(canonical);
  });

  it('does not let caller props override the canonical state marker', () => {
    const props = { variant: 'alert' as const, 'data-variant': 'neutral' };
    const badge = elementsFrom(render(createElement(Badge, props, 'Alerta')), 'span')[0];

    expect(badge.attributes['data-variant']).toBe('critical');
  });
});
