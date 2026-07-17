import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import SidebarNavItem, { NavIcon } from '@/components/platform/SidebarNavItem';
import type { SidebarIcon } from '@/components/platform/SidebarNavItem';
import { SidebarNavigationGroups } from '@/components/platform/Sidebar';
import type { NavigationGroup } from '@/components/platform/navigation';

const TEST_GROUPS = [
  {
    label: 'Evolução',
    items: [
      {
        href: '/desafios',
        label: 'Desafios',
        icon: 'desafios',
        description: 'Atividades em andamento',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

describe('Sidebar navigation rendering', () => {
  it('associates the canonical description with the keyboard-focusable link', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavItem, {
      href: '/desafios',
      icon: 'desafios',
      label: 'Desafios',
      description: 'Atividades em andamento',
      isActive: false,
    }));

    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(describedBy).toBeTruthy();
    expect(html).toContain(`id="${describedBy}"`);
    expect(html).toContain('class="sr-only">Atividades em andamento</span>');
  });

  it('fails explicitly instead of silently replacing an unsupported icon', () => {
    expect(() => renderToStaticMarkup(createElement(NavIcon, {
      name: 'unsupported' as SidebarIcon,
    }))).toThrowError('Unsupported navigation icon: unsupported');
  });

  it('renders labeled sections and lists with segment-aware active state', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavigationGroups, {
      groups: TEST_GROUPS,
      pathname: '/desafios/123',
      onNavigate: vi.fn(),
      idPrefix: 'test-navigation',
    }));

    expect(html).toContain('<section');
    expect(html).toContain('aria-labelledby="test-navigation-0"');
    expect(html).toContain('<h2 id="test-navigation-0"');
    expect(html).toContain('<ul');
    expect(html).toContain('<li>');
    expect(html).toContain('aria-current="page"');
  });
});
