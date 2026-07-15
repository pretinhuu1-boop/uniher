'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, Badge } from '@/components/ui/AvatarBadge';
import SidebarNavItem, { NavIcon } from './SidebarNavItem';
import {
  getNavigationForRole,
  getRoleHome,
  isNavigationItemActive,
  normalizeUserRole,
  resolveActiveView,
} from './navigation';
import type { NavigationGroup, NavigationItem } from './navigation';
import type { UserRole } from '@/types/platform';
import styles from './Sidebar.module.css';

const fetcher = (url: string) => fetch(url).then(response => response.json());

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Master',
  rh: 'Admin',
  lideranca: 'Liderança',
  colaboradora: 'Colaboradora',
};

const PERSONAL_NAVIGATION_GROUPS = [
  {
    label: 'Pessoal',
    items: [
      {
        href: '/notificacoes',
        label: 'Notificações',
        icon: 'notifications',
        description: 'Alertas e avisos do sistema para você',
      },
      {
        href: '/configuracoes',
        label: 'Configurações',
        icon: 'config',
        description: 'Preferências pessoais, senha e notificações',
      },
    ],
  },
] as const satisfies readonly NavigationGroup[];

interface SidebarNavigationGroupsProps {
  groups: readonly NavigationGroup[];
  pathname: string;
  onNavigate: () => void;
  idPrefix: string;
  renderItemChildren?: (item: NavigationItem) => ReactNode;
}

export function SidebarNavigationGroups({
  groups,
  pathname,
  onNavigate,
  idPrefix,
  renderItemChildren,
}: SidebarNavigationGroupsProps) {
  return groups.map((group, groupIndex) => {
    const headingId = `${idPrefix}-${groupIndex}`;

    return (
      <section key={group.label} className={styles.navSection} aria-labelledby={headingId}>
        <h2 id={headingId} className={styles.navLabel}>{group.label}</h2>
        <ul className={styles.navList}>
          {group.items.map(item => (
            <li key={item.href}>
              <SidebarNavItem
                href={item.href}
                icon={item.icon}
                label={item.label}
                description={item.description}
                isActive={isNavigationItemActive(pathname, item.href)}
                onClick={onNavigate}
              >
                {renderItemChildren?.(item)}
              </SidebarNavItem>
            </li>
          ))}
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
  const sidebarRef = useRef<HTMLElement>(null);
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  const realRole = normalizeUserRole(user?.role);
  const alsoCollab = Boolean(user?.also_collaborator) || realRole === 'lideranca';
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

  useEffect(() => {
    if (!isMobileDialogOpen) return;

    const focusFirstLinkIfOutsideDialog = () => {
      const sidebar = sidebarRef.current;
      if (!sidebar || sidebar.contains(document.activeElement)) return;

      sidebar
        .querySelector<HTMLAnchorElement>('nav a[href]')
        ?.focus({ preventScroll: true });
    };

    focusFirstLinkIfOutsideDialog();
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(focusFirstLinkIfOutsideDialog);
    });

    return () => {
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
  const navigationGroups = getNavigationForRole(role);
  const roleLabel = ROLE_LABELS[role];

  const handleSwitchView = (view: UserRole, closeAfterNavigation: boolean) => {
    setActiveView(view);
    sessionStorage.setItem('uniher-view-mode', view);
    router.push(getRoleHome(view));
    if (closeAfterNavigation) onClose();
  };

  const skipCompanyFetch = role === 'admin' || pathname === '/primeiro-acesso';
  const { data: companyData } = useSWR<{
    company: {
      name: string;
      trade_name: string | null;
      logo_url: string | null;
      primary_color: string | null;
    };
  }>(
    !skipCompanyFetch ? '/api/company' : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const company = companyData?.company;

  const { data: notificationData } = useSWR<{ unread: number }>(
    pathname !== '/primeiro-acesso' ? '/api/notifications/count' : null,
    fetcher,
    { refreshInterval: 30000, dedupingInterval: 5000, revalidateOnFocus: true },
  );
  const unreadCount = notificationData?.unread ?? 0;

  const initials = user?.name
    ? user.name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()
    : 'UN';

  const performLogout = async () => {
    await logout();
  };

  const closeAfterMobileNavigation = () => {
    if (isMobile) onClose();
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
          <Image
            src="/logo-uniher.png"
            alt="UniHER"
            width={140}
            height={116}
            className={styles.brandLogo}
            priority
          />
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
              {ROLE_LABELS[realRole]}
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
          pathname={pathname}
          onNavigate={onNavigate}
          idPrefix={`platform-navigation-${role}`}
        />
        <SidebarNavigationGroups
          groups={PERSONAL_NAVIGATION_GROUPS}
          pathname={pathname}
          onNavigate={onNavigate}
          idPrefix="platform-navigation-personal"
          renderItemChildren={item => item.href === '/notificacoes' && unreadCount > 0 ? (
            <Badge variant="alert" size="sm" className={styles.navBadge}>{unreadCount}</Badge>
          ) : null}
        />
        <button type="button" className={styles.logoutNav} onClick={performLogout}>
          <NavIcon name="logout" />
          Sair da conta
        </button>
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
            aria-label="Sair da conta"
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
