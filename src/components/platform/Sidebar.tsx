'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui/AvatarBadge';
import Image from 'next/image';
import SidebarNavItem, { NavIcon } from './SidebarNavItem';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type NavItem = { href: string; label: string; icon: string };

const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { href: '/admin', label: 'Painel Master', icon: 'companies' },
    { href: '/analytics-emails', label: 'Analytics Global', icon: 'analytics' },
  ],
  rh: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/colaboradoras-gestao', label: 'Colaboradoras', icon: 'colaboradoras' },
    { href: '/departamentos', label: 'Departamentos', icon: 'departamentos' },
    { href: '/semaforo', label: 'Semáforo de Saúde', icon: 'semaforo' },
    { href: '/campanhas', label: 'Campanhas', icon: 'campanhas' },
    { href: '/objetivos', label: 'Objetivos & Recompensas', icon: 'objetivos' },
    { href: '/desafios/gerenciar', label: 'Gerenciar Desafios', icon: 'desafios' },
    { href: '/liga/gerenciar', label: 'Gerenciar Ligas', icon: 'liga' },
    { href: '/convites', label: 'Convites', icon: 'invite' },
    { href: '/historico', label: 'Histórico', icon: 'historico' },
    { href: '/analytics-emails', label: 'Analytics de Emails', icon: 'analytics' },
    { href: '/company-profile', label: 'Perfil da Empresa', icon: 'profile' },
  ],
  lideranca: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/semaforo', label: 'Semáforo da Equipe', icon: 'semaforo' },
    { href: '/campanhas', label: 'Campanhas', icon: 'campanhas' },
    { href: '/objetivos', label: 'Objetivos & Recompensas', icon: 'objetivos' },
    { href: '/desafios', label: 'Desafios', icon: 'desafios' },
    { href: '/historico', label: 'Histórico', icon: 'historico' },
  ],
  colaboradora: [
    { href: '/colaboradora', label: 'Meu Painel', icon: 'dashboard' },
    { href: '/semaforo', label: 'Meu Semáforo', icon: 'semaforo' },
    { href: '/campanhas', label: 'Campanhas', icon: 'campanhas' },
    { href: '/objetivos', label: 'Objetivos & Recompensas', icon: 'objetivos' },
    { href: '/desafios', label: 'Desafios', icon: 'desafios' },
    { href: '/conquistas', label: 'Conquistas', icon: 'conquistas' },
    { href: '/liga', label: 'Liga Semanal', icon: 'liga' },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Master',
  rh: 'RH',
  lideranca: 'Liderança',
  colaboradora: 'Colaboradora',
};

const BOTTOM_ITEMS = [
  { href: '/configuracoes', label: 'Configurações', icon: 'config' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const role = user?.role || 'colaboradora';
  const navItems = NAV_ITEMS_BY_ROLE[role] || NAV_ITEMS_BY_ROLE.colaboradora;
  const roleLabel = ROLE_LABELS[role] || 'Colaboradora';

  // Company branding (only for non-admin users with a company)
  const { data: companyData } = useSWR<{ company: { name: string; trade_name: string | null; logo_url: string | null; primary_color: string | null } }>(
    role !== 'admin' ? '/api/company' : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const company = companyData?.company;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'UN';

  return (
    <>
      {/* Overlay Mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-rose-700/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Aside */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 h-screen w-72 bg-white border-r border-border-1 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="border-b border-border-1">
          <div
            className="h-16 flex items-center gap-3 px-6 cursor-pointer group hover:bg-cream-50/50 transition-colors"
            onClick={() => router.push('/')}
          >
          {/* Logo oficial */}
          <div className="relative flex-shrink-0 transform transition-transform group-hover:scale-105">
            <Image src="/logo-uniher.png" alt="UniHER" width={140} height={56} className="object-contain" style={{ width: 140, height: 'auto' }} />
          </div>
          </div>

          {/* Company branding strip — shown below UniHER, never replaces it */}
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

        {/* Scrollable Nav List */}
        <nav role="navigation" aria-label="Menu principal" className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-cream-200">
          <div className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-uni-text-300">Principal</div>
            {navItems.map(item => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href}
                onClick={onClose}
              />
            ))}
          </div>

          <div className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-uni-text-300">Pessoal</div>
            <SidebarNavItem
              href="/notificacoes"
              icon="notifications"
              label="Notificações"
              isActive={pathname === '/notificacoes'}
              onClick={onClose}
            >
              <Badge variant="alert" size="sm" className="ml-auto w-5 h-5 p-0 flex items-center justify-center">2</Badge>
            </SidebarNavItem>

            {BOTTOM_ITEMS.map(item => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={pathname === item.href}
                onClick={onClose}
              />
            ))}
          </div>

          <button
            className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-all duration-200 text-left"
            onClick={() => { logout(); window.location.href = '/auth'; }}
          >
            <NavIcon name="logout" />
            Sair da Conta
          </button>
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-border-1 bg-cream-50/50">
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar fallback={role === 'admin' ? '🔑' : initials} size="sm" className={role === 'admin' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200'} />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-xs font-bold text-uni-text-900 truncate uppercase tracking-wide">{user?.name || 'Usuário'}</span>
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
