'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui/AvatarBadge';
import Image from 'next/image';
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
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Master',
  rh: 'Admin',
  lideranca: 'Lideranca',
  colaboradora: 'Colaboradora',
};

const PERSONAL_NAVIGATION_GROUPS = [
  {
    label: 'Pessoal',
    items: [
      {
        href: '/notificacoes',
        label: 'Notificacoes',
        icon: 'notifications',
        description: 'Alertas e avisos do sistema para você',
      },
      {
        href: '/configuracoes',
        label: 'Configuracoes',
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
      <section key={group.label} className="space-y-1" aria-labelledby={headingId}>
        <h2 id={headingId} className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-uni-text-300">
          {group.label}
        </h2>
        <ul className="space-y-1">
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
  const { user, logout } = useAuth();

  const realRole = normalizeUserRole(user?.role);
  const alsoCollab = Boolean(user?.also_collaborator) || realRole === 'lideranca';
  const canSwitchView = alsoCollab && realRole !== 'colaboradora';

  const [activeView, setActiveView] = useState<UserRole>(realRole);

  useEffect(() => {
    const savedView = typeof window === 'undefined'
      ? null
      : sessionStorage.getItem('uniher-view-mode');
    setActiveView(resolveActiveView(realRole, canSwitchView, savedView));
  }, [realRole, canSwitchView]);

  const role = activeView;
  const navigationGroups = getNavigationForRole(role);
  const roleLabel = ROLE_LABELS[role];

  const handleSwitchView = (view: UserRole) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('uniher-view-mode', view);
    }
    router.push(getRoleHome(view));
    onClose();
  };

  const skipCompanyFetch = role === 'admin' || pathname === '/primeiro-acesso';
  const { data: companyData } = useSWR<{ company: { name: string; trade_name: string | null; logo_url: string | null; primary_color: string | null } }>(
    !skipCompanyFetch ? '/api/company' : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const company = companyData?.company;

  const { data: notifData } = useSWR<{ unread: number }>(
    pathname !== '/primeiro-acesso' ? '/api/notifications/count' : null,
    fetcher,
    { refreshInterval: 30000, dedupingInterval: 5000, revalidateOnFocus: true }
  );
  const unreadCount = notifData?.unread ?? 0;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'UN';

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-rose-700/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-border-1 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="border-b border-border-1">
          <div
            className="h-16 flex items-center gap-3 px-6 cursor-pointer group hover:bg-cream-50/50 transition-colors"
            onClick={() => router.push('/')}
          >
            <div className="relative flex-shrink-0 transform transition-transform group-hover:scale-105">
              <Image src="/logo-uniher.png" alt="UniHER" width={140} height={56} className="object-contain" style={{ width: 140, height: 'auto' }} />
            </div>
          </div>

          {company && (
            <div className="flex items-center gap-2.5 px-6 py-2.5 bg-cream-50/80 border-t border-border-1">
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 overflow-hidden"
                style={company.primary_color
                  ? { background: company.primary_color + '25', border: `1px solid ${company.primary_color}50`, color: company.primary_color }
                  : { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }
                }
              >
                {company.logo_url
                  ? <img src={company.logo_url} alt="" className="w-full h-full object-contain" />
                  : (company.trade_name || company.name).slice(0, 2).toUpperCase()
                }
              </div>
              <span className="text-[11px] font-semibold text-uni-text-600 truncate">{company.trade_name || company.name}</span>
            </div>
          )}
        </div>

        {canSwitchView && (
          <div className="px-4 py-2 border-b border-border-1 bg-cream-50/50">
            <div className="text-[10px] font-bold uppercase tracking-widest text-uni-text-300 mb-1.5 px-1">Visualizar como</div>
            <div className="flex gap-1">
              <button
                onClick={() => handleSwitchView(realRole)}
                className={cn(
                  'flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold transition-all',
                  activeView === realRole
                    ? 'bg-gold-500 text-white shadow-sm'
                    : 'bg-white text-uni-text-500 border border-border-1 hover:bg-cream-50'
                )}
              >
                {ROLE_LABELS[realRole]}
              </button>
              <button
                onClick={() => handleSwitchView('colaboradora')}
                className={cn(
                  'flex-1 text-xs py-1.5 px-2 rounded-lg font-semibold transition-all',
                  activeView === 'colaboradora'
                    ? 'bg-gold-500 text-white shadow-sm'
                    : 'bg-white text-uni-text-500 border border-border-1 hover:bg-cream-50'
                )}
              >
                Colaboradora
              </button>
            </div>
          </div>
        )}

        <nav role="navigation" aria-label="Menu principal" className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-cream-200">
          <SidebarNavigationGroups
            groups={navigationGroups}
            pathname={pathname}
            onNavigate={onClose}
            idPrefix={`platform-navigation-${role}`}
          />

          <SidebarNavigationGroups
            groups={PERSONAL_NAVIGATION_GROUPS}
            pathname={pathname}
            onNavigate={onClose}
            idPrefix="platform-navigation-personal"
            renderItemChildren={(item) => item.href === '/notificacoes' && unreadCount > 0 ? (
              <Badge variant="alert" size="sm" className="ml-auto w-5 h-5 p-0 flex items-center justify-center">{unreadCount}</Badge>
            ) : null}
          />

          <button
            className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-all duration-200 text-left"
            onClick={() => { logout(); window.location.href = '/auth'; }}
          >
            <NavIcon name="logout" />
            Sair da Conta
          </button>
        </nav>

        <div className="p-4 border-t border-border-1 bg-cream-50/50">
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar fallback={role === 'admin' ? '🔑' : initials} size="sm" className={role === 'admin' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200'} />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-xs font-bold text-uni-text-900 truncate uppercase tracking-wide">{user?.name || 'Usuario'}</span>
                <Badge variant="secondary" size="sm" className="text-[9px] px-1 py-0">{roleLabel}</Badge>
              </div>
              <span className="text-[10px] text-uni-text-600 truncate">{role === 'admin' ? 'Sistema UniHER' : (user?.email || '')}</span>
            </div>
            <button
              onClick={() => { logout(); window.location.href = '/auth'; }}
              className="flex-shrink-0 p-1.5 rounded-lg text-uni-text-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
              aria-label="Sair da conta"
              title="Sair"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
