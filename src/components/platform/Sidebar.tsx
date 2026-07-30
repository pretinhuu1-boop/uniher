'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { clearProtectedReportCaches, useAuth } from '@/hooks/useAuth';
import { getUserRoleLabel } from '@/lib/users/role-label';
import { Avatar, Badge } from '@/components/ui/AvatarBadge';
import SidebarNavItem, { NavIcon, type SidebarNavVariant } from './SidebarNavItem';
import {
  getModuleAwareNavigationForRole,
  getRoleHome,
  isNavigationItemActive,
  normalizeUserRole,
  resolveActiveView,
} from './navigation';
import type { NavigationGroup, NavigationItem } from './navigation';
import type { CompanyModuleNavigationRecord } from '@/types/modules';
import type { UserRole } from '@/types/platform';
import styles from './Sidebar.module.css';

type ScopedApiKey = readonly [string, ...unknown[]];

const scopedFetcher = (key: ScopedApiKey) => (
  fetch(key[0]).then(response => response.json())
);

const PERSONAL_NOTIFICATIONS_ITEM = {
  href: '/notificacoes',
  label: 'Notificações',
  icon: 'notifications',
  description: 'Alertas e avisos do sistema para você',
} as const satisfies NavigationItem;

const PERSONAL_SETTINGS_ITEM = {
  href: '/configuracoes',
  label: 'Configurações',
  icon: 'config',
  description: 'Preferências pessoais, senha e notificações',
} as const satisfies NavigationItem;

const PERSONAL_ACCOUNT_ITEM = {
  href: '/configuracoes',
  label: 'Conta pessoal',
  icon: 'config',
  description: 'Preferências pessoais, senha e notificações',
} as const satisfies NavigationItem;

function getPersonalNavigationGroups(role: UserRole): readonly NavigationGroup[] {
  if (role === 'colaboradora') {
    return [{
      label: 'Minha Conta',
      items: [PERSONAL_NOTIFICATIONS_ITEM, PERSONAL_SETTINGS_ITEM],
    }];
  }

  if (role === 'admin') {
    return [{
      label: 'Minha Conta',
      items: [PERSONAL_NOTIFICATIONS_ITEM, PERSONAL_ACCOUNT_ITEM],
    }];
  }

  return [{
    label: 'Minha Conta',
    items: [PERSONAL_ACCOUNT_ITEM],
  }];
}

const NAVIGATION_PRESENTATION_DETAILS: Readonly<Record<SidebarNavVariant, Readonly<Record<string, readonly string[]>>>> = {
  collaborator: {
    '/semaforo': ['Semáforo da Saúde'],
    '/colaboradora': ['Check-in - Como você chega hoje?', 'Check-out - Como você encerra o seu dia?'],
    '/objetivos': ['Pessoal', 'Auto-iniciado', 'Sem comparação'],
    '/desafios': ['Voluntário', 'Empresa', 'Sem Liga'],
    '/conquistas': ['Privado', 'Eventos elegíveis', 'Sem ranking'],
  },
  manager: {
    '/dashboard': ['Visão geral da empresa', 'Todos os indicadores e gráficos', 'Check-in x Check-out'],
    '/dashboard?section=saude-primaria': ['Semáforo da Saúde', 'Indicadores agregados'],
    '/campanhas': ['Campanhas de saúde', 'Conteúdos publicados'],
    '/gamificacao-config': ['Objetivos', 'Desafios', 'Conquistas em revisão'],
  },
  admin: {
    '/admin': ['Visão consolidada', 'Indicadores da plataforma'],
    '/admin?tab=empresas': ['Empresas', 'Usuários', 'Módulos contratados'],
    '/dashboard?section=saude-primaria': ['Sem\u00e1foro consolidado', 'Indicadores por empresa'],
    '/dashboard?section=exames': ['Exames em dia', 'Indicadores de preven\u00e7\u00e3o'],
    '/produtos-modulos': ['Controle de m\u00f3dulos contratados', 'Ativa\u00e7\u00e3o de funcionalidades sob gate'],
    '/gamificacao-config': ['Objetivos', 'Desafios', 'Sem ranking ativo'],
  },
  personal: {},
};

function getPresentationDetails(item: NavigationItem, variant: SidebarNavVariant): readonly string[] {
  return NAVIGATION_PRESENTATION_DETAILS[variant][item.href] ?? [];
}

interface SidebarNavigationGroupsProps {
  groups: readonly NavigationGroup[];
  pathname: string;
  onNavigate: () => void;
  idPrefix: string;
  variant?: SidebarNavVariant;
  showChevron?: boolean | 'first-group';
  renderItemChildren?: (item: NavigationItem) => ReactNode;
}

export function SidebarNavigationGroups({
  groups,
  pathname,
  onNavigate,
  idPrefix,
  variant = 'collaborator',
  showChevron = false,
  renderItemChildren,
}: SidebarNavigationGroupsProps) {
  const browserLocation = typeof window === 'undefined'
    ? pathname
    : `${window.location.pathname}${window.location.search}`;

  return groups.map((group, groupIndex) => {
    const headingId = `${idPrefix}-${groupIndex}`;

    return (
      <section key={group.label} className={styles.navSection} aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.navLabel}>{group.label}</h2>
        <ul className={styles.navList}>
          {group.items.map((item) => {
            const shouldShowChevron = showChevron === true || (showChevron === 'first-group' && groupIndex === 0);

            return (
              <li key={item.href}>
                <SidebarNavItem
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  description={item.description}
                  variant={variant}
                  details={getPresentationDetails(item, variant)}
                  showChevron={shouldShowChevron}
                  isActive={
                    isNavigationItemActive(pathname, item.href)
                    || isNavigationItemActive(browserLocation, item.href)
                  }
                  onClick={onNavigate}
                >
                  {renderItemChildren?.(item) ?? (item.badgeLabel ? (
                    <Badge variant="secondary" size="sm" className={styles.navBadge}>{item.badgeLabel}</Badge>
                  ) : null)}
                </SidebarNavItem>
              </li>
            );
          })}
        </ul>
      </section>
    );
  });
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sidebarRef = useRef<HTMLElement>(null);
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  const realRole = normalizeUserRole(user?.role);
  const alsoCollab = Boolean(user?.also_collaborator);
  const canSwitchView = alsoCollab && realRole !== 'colaboradora';
  const [activeView, setActiveView] = useState<UserRole>(realRole);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener('change', updateViewport);
    return () => mediaQuery.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobile && isOpen) onClose();
  }, [isMobile, isOpen, onClose]);

  useEffect(() => {
    const savedView = typeof window === 'undefined'
      ? null
      : sessionStorage.getItem('uniher-view-mode');
    setActiveView(resolveActiveView(realRole, canSwitchView, savedView));
  }, [realRole, canSwitchView]);

  const isMobileDialogOpen = isMobile && isOpen;

  useLayoutEffect(() => {
    if (!isMobileDialogOpen) return;

    const focusFirstLinkIfOutsideDialog = () => {
      const sidebar = sidebarRef.current;
      if (!sidebar || sidebar.contains(document.activeElement)) return;

      sidebar
        .querySelector<HTMLAnchorElement>('nav a[href]')
        ?.focus({ preventScroll: true });
    };

    focusFirstLinkIfOutsideDialog();
    const focusTimeout = window.setTimeout(focusFirstLinkIfOutsideDialog, 0);
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(focusFirstLinkIfOutsideDialog);
    });

    return () => {
      window.clearTimeout(focusTimeout);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [isMobileDialogOpen]);

  useEffect(() => {
    if (!isMobileDialogOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !sidebarRef.current) return;

      const focusableElements = Array.from(
        sidebarRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(element => element.getClientRects().length > 0);

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && (activeElement === firstFocusable || !sidebarRef.current.contains(activeElement))) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileDialogOpen, onClose]);

  const role = activeView;
  const roleLabel = getUserRoleLabel(role);
  const menuVariant: SidebarNavVariant = role === 'admin'
    ? 'admin'
    : role === 'rh' || role === 'lideranca'
      ? 'manager'
      : 'collaborator';
  const brandSubtitle = role === 'admin'
    ? 'Administrador da Plataforma'
    : role === 'rh' || role === 'lideranca'
      ? 'RH | Gestão da Saúde e Bem-estar'
      : 'Saúde Feminina';
  const search = searchParams.toString();
  const currentLocation = search ? `${pathname}?${search}` : pathname;

  useEffect(() => {
    const navigation = sidebarRef.current?.querySelector<HTMLElement>('nav');
    const activeLink = navigation?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!navigation || !activeLink) return;

    const keepActiveLinkVisible = () => {
      const navigationRect = navigation.getBoundingClientRect();
      const activeRect = activeLink.getBoundingClientRect();

      if (activeRect.bottom > navigationRect.bottom) {
        navigation.scrollTop += activeRect.bottom - navigationRect.bottom + 12;
      } else if (activeRect.top < navigationRect.top) {
        navigation.scrollTop -= navigationRect.top - activeRect.top + 12;
      }
    };

    const frame = window.requestAnimationFrame(keepActiveLinkVisible);
    const followUp = window.setTimeout(keepActiveLinkVisible, 400);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(followUp);
    };
  }, [currentLocation, role]);

  const handleSwitchView = async (view: UserRole, closeAfterNavigation: boolean) => {
    if (view === activeView) {
      if (closeAfterNavigation) onClose();
      return;
    }
    await clearProtectedReportCaches();
    setActiveView(view);
    sessionStorage.setItem('uniher-view-mode', view);
    router.push(getRoleHome(view));
    if (closeAfterNavigation) onClose();
  };

  const companyEndpoint = (() => {
    if (pathname === '/primeiro-acesso' || role === 'admin' || !user?.companyId) return null;
    if (realRole === 'rh') return '/api/company';
    if (realRole === 'colaboradora' || alsoCollab) return '/api/collaborator/company';
    return null;
  })();
  const companyCacheKey = companyEndpoint && user?.companyId
    ? [companyEndpoint, user.id, user.companyId, realRole] as const
    : null;
  const { data: companyData } = useSWR<{
    company: {
      name: string;
      trade_name: string | null;
      logo_url: string | null;
      primary_color: string | null;
    };
  }>(
    companyCacheKey,
    scopedFetcher,
    { revalidateOnFocus: false },
  );
  const company = companyData?.company;

  const moduleCacheKey = pathname !== '/primeiro-acesso' && user?.companyId
    ? ['/api/company/modules', user.id, user.companyId, role] as const
    : null;
  const { data: moduleData } = useSWR<{ modules: CompanyModuleNavigationRecord[] }>(
    moduleCacheKey,
    scopedFetcher,
    { revalidateOnFocus: false },
  );
  const navigationGroups = getModuleAwareNavigationForRole(role, moduleData?.modules ?? []);

  const notificationCacheKey = pathname !== '/primeiro-acesso' && user
    ? ['/api/notifications/count', user.id, user.companyId ?? null, realRole] as const
    : null;
  const { data: notificationData } = useSWR<{ unread: number }>(
    notificationCacheKey,
    scopedFetcher,
    { refreshInterval: 30000, dedupingInterval: 5000, revalidateOnFocus: true },
  );
  const unreadCount = notificationData?.unread ?? 0;
  const personalNavigationGroups = getPersonalNavigationGroups(role);
  const logoutLabel = role === 'admin' ? 'Sair da Plataforma' : 'Sair da Conta';

  const initials = user?.name
    ? user.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()
    : 'UN';

  const performLogout = async () => {
    await logout();
  };

  const closeAfterMobileNavigation = () => {
    if (isMobile) onClose();
  };

  const renderNavigationBadge = (item: NavigationItem) => {
    if (item.href === '/notificacoes' && unreadCount > 0) {
      return <Badge variant="alert" size="sm" className={styles.navBadge}>{unreadCount}</Badge>;
    }

    return item.badgeLabel ? (
      <Badge variant="secondary" size="sm" className={styles.navBadge}>{item.badgeLabel}</Badge>
    ) : null;
  };

  const renderPersonalNavigation = (onNavigate: () => void) => {
    const group = personalNavigationGroups[0];
    const headingId = 'platform-navigation-personal-0';

    return (
      <section className={styles.navSection} aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.navLabel}>{group.label}</h2>
        <ul className={styles.navList}>
          {group.items.map((item) => (
            <li key={item.href}>
              <SidebarNavItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                description={item.description}
                variant="personal"
                isActive={isNavigationItemActive(currentLocation, item.href)}
                onClick={onNavigate}
              >
                {renderNavigationBadge(item)}
              </SidebarNavItem>
            </li>
          ))}
          <li>
            <button type="button" className={styles.logoutNav} onClick={performLogout}>
              <NavIcon name="logout" />
              {logoutLabel}
            </button>
          </li>
        </ul>
      </section>
    );
  };

  const renderSidebarContent = (onNavigate: () => void, closeAfterSwitch: boolean) => (
    <>
      <div className={styles.brandBlock}>
        <button
          type="button"
          className={styles.brandButton}
          onClick={() => {
            router.push('/');
            onNavigate();
          }}
          aria-label="Ir para o início da UniHER"
        >
          <span className={styles.brandLogoTile}>
            <img
              src="/logo-uniher.png"
              alt="UniHER"
              width={140}
              height={116}
              className={styles.brandLogo}
            />
          </span>
          <span className={styles.brandIdentity}>
            <span className={styles.brandName}>UniHER</span>
            <span className={styles.brandSubtitle}>{brandSubtitle}</span>
          </span>
        </button>

        {company ? (
          <div className={styles.companyCard}>
            <div
              className={styles.companyMark}
              style={company.primary_color
                ? {
                    background: `${company.primary_color}25`,
                    borderColor: `${company.primary_color}80`,
                    color: company.primary_color,
                  }
                : undefined}
            >
              {company.logo_url ? (
                <img src={company.logo_url} alt="" className={styles.companyLogo} />
              ) : (
                (company.trade_name || company.name).slice(0, 2).toUpperCase()
              )}
            </div>
            <span className={styles.companyName}>{company.trade_name || company.name}</span>
          </div>
        ) : null}
      </div>

      {canSwitchView ? (
        <div className={styles.viewSwitcher}>
          <span className={styles.viewLabel}>Visualizar como</span>
          <div className={styles.viewOptions}>
            <button
              type="button"
              onClick={() => handleSwitchView(realRole, closeAfterSwitch)}
              className={`${styles.viewButton} ${activeView === realRole ? styles.viewButtonActive : ''}`}
            >
              {getUserRoleLabel(realRole)}
            </button>
            <button
              type="button"
              onClick={() => handleSwitchView('colaboradora', closeAfterSwitch)}
              className={`${styles.viewButton} ${activeView === 'colaboradora' ? styles.viewButtonActive : ''}`}
            >
              Colaboradora
            </button>
          </div>
        </div>
      ) : null}

      <nav aria-label="Navegação principal" className={styles.navigation}>
        <SidebarNavigationGroups
          groups={navigationGroups}
          pathname={currentLocation}
          onNavigate={onNavigate}
          idPrefix={`platform-navigation-${role}`}
          variant={menuVariant}
          showChevron={role === 'admin' ? 'first-group' : false}
          renderItemChildren={renderNavigationBadge}
        />
        {renderPersonalNavigation(onNavigate)}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userCard}>
          <Avatar
            fallback={role === 'admin' ? 'U' : initials}
            size="sm"
            className={styles.userAvatar}
          />
          <div className={styles.userDetails}>
            <div className={styles.userMetaRow}>
              <span className={styles.userName}>{user?.name || 'Usuário'}</span>
              <Badge variant="secondary" size="sm" className={styles.roleBadge}>{roleLabel}</Badge>
            </div>
            <span className={styles.userEmail}>
              {role === 'admin' ? 'Sistema UniHER' : (user?.email || '')}
            </span>
          </div>
          <button
            type="button"
            onClick={performLogout}
            className={styles.footerLogout}
            aria-label={logoutLabel}
          >
            <NavIcon name="logout" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {isMobileDialogOpen ? (
        <div className={styles.overlay} aria-hidden="true" onClick={onClose} />
      ) : null}
      <aside
        ref={sidebarRef}
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
        role={isMobileDialogOpen ? 'dialog' : undefined}
        aria-modal={isMobileDialogOpen ? true : undefined}
        aria-label={isMobileDialogOpen ? 'Navegação' : 'Navegação principal'}
        aria-hidden={isMobile && !isOpen ? true : undefined}
        inert={isMobile && !isOpen ? true : undefined}
      >
        <button
          type="button"
          className={styles.closeButton}
          aria-label="Fechar navegação"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {renderSidebarContent(closeAfterMobileNavigation, isMobile)}
      </aside>
    </>
  );
}
