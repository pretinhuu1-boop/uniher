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
        badgeLabel: 'Bloqueado',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

const ADMIN_QUERY_GROUPS = [
  {
    label: 'Admin',
    items: [
      {
        href: '/admin',
        label: 'Dashboard geral',
        icon: 'companies',
        description: 'Resumo master',
      },
      {
        href: '/admin?tab=empresas',
        label: 'Empresas',
        icon: 'companies',
        description: 'Empresas cadastradas',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

const ADMIN_WITH_PERSONAL_GROUPS = [
  {
    label: 'Admin',
    items: [
      {
        href: '/admin?tab=sistema',
        label: 'Sistema',
        icon: 'config',
        description: 'Configuracoes gerais da plataforma',
      },
    ],
  },
  {
    label: 'Pessoal',
    items: [
      {
        href: '/configuracoes',
        label: 'Minha conta',
        icon: 'config',
        description: 'Preferencias pessoais, senha e notificacoes',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

const ADMIN_TWO_GROUPS = [
  {
    label: 'Principal',
    items: [
      {
        href: '/admin',
        label: 'Dashboard geral',
        icon: 'dashboard',
        description: 'Resumo master',
      },
      {
        href: '/admin?tab=empresas',
        label: 'Empresas',
        icon: 'companies',
        description: 'Empresas cadastradas',
      },
    ],
  },
  {
    label: 'Administração',
    items: [
      {
        href: '/admin?tab=admin',
        label: 'Administradores UniHER',
        icon: 'profile',
        description: 'Gestao dos administradores',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

describe('Sidebar navigation rendering', () => {
  it('associates the visible canonical description with the keyboard-focusable link', () => {
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
    expect(html).toContain('Atividades em andamento');
  });

  it('renders optional presentation details without replacing the canonical description', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavItem, {
      href: '/colaboradora',
      icon: 'semaforo',
      label: 'Saude Primaria',
      description: 'Semaforo da Saude',
      details: ['Check-in', 'Check-out'],
      isActive: false,
    }));

    expect(html).toContain('Semaforo da Saude');
    expect(html).toContain('Check-in');
    expect(html).toContain('Check-out');
    expect(html).toContain('Resumo do item');
  });

  it('fails explicitly instead of silently replacing an unsupported icon', () => {
    expect(() => renderToStaticMarkup(createElement(NavIcon, {
      name: 'unsupported' as SidebarIcon,
    }))).toThrowError('Unsupported navigation icon: unsupported');
  });

  it('renders the dedicated Lucide community icon', () => {
    const html = renderToStaticMarkup(createElement(NavIcon, { name: 'community' }));

    expect(html).toContain('lucide-messages-square');
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
    expect(html).toContain('Bloqueado');
    expect(html).not.toContain('DesafiosBloqueado');
    expect(html).toContain('Atividades em andamento');
  });

  it('renders sequence numbers and chevrons only when requested for operational menus', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavigationGroups, {
      groups: ADMIN_QUERY_GROUPS,
      pathname: '/admin',
      onNavigate: vi.fn(),
      idPrefix: 'admin-numbered-navigation',
      variant: 'admin',
      showSequence: true,
      showChevron: true,
    }));

    expect(html).toContain('>1</span>');
    expect(html).toContain('>2</span>');
    expect(html).toContain('aria-hidden="true"');
  });

  it('can limit sequence numbers and chevrons to the primary operational group', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavigationGroups, {
      groups: ADMIN_TWO_GROUPS,
      pathname: '/admin',
      onNavigate: vi.fn(),
      idPrefix: 'admin-primary-only-navigation',
      variant: 'admin',
      showSequence: 'first-group',
      showChevron: 'first-group',
    }));

    expect(html).toContain('>1</span>');
    expect(html).toContain('>2</span>');
    expect(html).not.toContain('>3</span>');
    expect(html).toContain('Administradores UniHER');
    expect(html.match(/class="[^"]*navChevron/g)).toHaveLength(2);
  });

  it('renders operational chevrons without numeric badges when numbering is disabled', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavigationGroups, {
      groups: ADMIN_TWO_GROUPS,
      pathname: '/admin',
      onNavigate: vi.fn(),
      idPrefix: 'admin-unnumbered-navigation',
      variant: 'admin',
      showSequence: false,
      showChevron: 'first-group',
    }));

    expect(html).not.toContain('>1</span>');
    expect(html).not.toContain('>2</span>');
    expect(html.match(/class="[^"]*navChevron/g)).toHaveLength(2);
    expect(html).toContain('Administradores UniHER');
  });

  it('marks query-specific admin shortcuts active without activating the base admin dashboard', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavigationGroups, {
      groups: ADMIN_QUERY_GROUPS,
      pathname: '/admin?tab=empresas',
      onNavigate: vi.fn(),
      idPrefix: 'admin-navigation',
    }));

    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/admin?tab=empresas"');
    expect(html).toContain('Empresas');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/admin\?tab=empresas"/);
    expect(html).not.toMatch(/<a[^>]*aria-current="page"[^>]*href="\/admin"/);
  });

  it('renders distinct labels for platform settings and personal account settings', () => {
    const html = renderToStaticMarkup(createElement(SidebarNavigationGroups, {
      groups: ADMIN_WITH_PERSONAL_GROUPS,
      pathname: '/configuracoes',
      onNavigate: vi.fn(),
      idPrefix: 'admin-personal-navigation',
    }));

    expect(html).toContain('Sistema');
    expect(html).toContain('Minha conta');
    expect(html).not.toContain('>Configurações<');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*href="\/configuracoes"/);
  });
});
