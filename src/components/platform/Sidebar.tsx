'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui/AvatarBadge';
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
    { href: '/semaforo', label: 'Semáforo de Saúde', icon: 'semaforo' },
    { href: '/campanhas', label: 'Campanhas', icon: 'campanhas' },
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
    { href: '/desafios', label: 'Desafios', icon: 'desafios' },
    { href: '/historico', label: 'Histórico', icon: 'historico' },
  ],
  colaboradora: [
    { href: '/colaboradora', label: 'Meu Painel', icon: 'dashboard' },
    { href: '/semaforo', label: 'Meu Semáforo', icon: 'semaforo' },
    { href: '/campanhas', label: 'Campanhas', icon: 'campanhas' },
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

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    companies: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M9 18v.01" />
      </svg>
    ),
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    semaforo: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    campanhas: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 2v4" />
        <path d="M16 2v4" />
      </svg>
    ),
    desafios: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
    conquistas: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
    liga: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
      </svg>
    ),
    historico: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    notifications: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
    ),
    analytics: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    config: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    invite: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12" />
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };
  return <span className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity">{icons[name] || icons.dashboard}</span>;
}

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
          {/* Logo oficial – flor de lótus dourada sobre fundo creme */}
          <div className="relative w-10 h-10 flex-shrink-0 transform transition-transform group-hover:scale-110">
            <div className="w-10 h-10 bg-cream-100 rounded-xl flex items-center justify-center shadow-sm border border-gold-200/50">
              <svg viewBox="0 0 48 48" fill="none" className="w-7 h-7">
                {/* Pétala traseira esquerda */}
                <path d="M14 32C14 32 10 24 12 16C13 12 16 10 18 12C18 12 14 20 14 32Z" fill="#D4A853" stroke="#B8922A" strokeWidth="0.8"/>
                {/* Pétala traseira direita */}
                <path d="M34 32C34 32 38 24 36 16C35 12 32 10 30 12C30 12 34 20 34 32Z" fill="#D4A853" stroke="#B8922A" strokeWidth="0.8"/>
                {/* Pétala central grande */}
                <path d="M24 36C24 36 16 28 16 20C16 14 20 10 24 10C28 10 32 14 32 20C32 28 24 36 24 36Z" fill="#E8C468" stroke="#B8922A" strokeWidth="1"/>
                {/* Pétala interna */}
                <path d="M24 34C24 34 18 26 19 19C20 15 22 12 24 12C26 12 28 15 29 19C30 26 24 34 24 34Z" fill="#F5D98B" stroke="#D4A853" strokeWidth="0.6"/>
                {/* Bolinha central base */}
                <circle cx="24" cy="10" r="2" fill="#B8922A"/>
              </svg>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-display font-bold text-uni-text-900 leading-none">UniHER</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mt-1">Saúde Feminina</span>
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
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-thin scrollbar-thumb-cream-200">
          <div className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-uni-text-300">Principal</div>
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-200",
                  pathname === item.href 
                    ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-100" 
                    : "text-uni-text-600 hover:bg-cream-100 hover:text-uni-text-900"
                )}
                onClick={onClose}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="space-y-1">
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-uni-text-300">Pessoal</div>
            <Link
              href="/notificacoes"
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-200",
                pathname === '/notificacoes' ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-100" : "text-uni-text-600 hover:bg-cream-100 hover:text-uni-text-900"
              )}
              onClick={onClose}
            >
              <NavIcon name="notifications" />
              Notificações
              <Badge variant="alert" size="sm" className="ml-auto w-5 h-5 p-0 flex items-center justify-center">2</Badge>
            </Link>

            {BOTTOM_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all duration-200",
                  pathname === item.href ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-100" : "text-uni-text-600 hover:bg-cream-100 hover:text-uni-text-900"
                )}
                onClick={onClose}
              >
                <NavIcon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>

          <button
            className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-all duration-200 text-left"
            onClick={() => { logout(); window.location.href = '/auth'; }}
          >
            <NavIcon name="logout" />
            Sair da Conta
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-t border-border-1 bg-cream-50/50">
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar fallback={role === 'admin' ? '🔑' : initials} size="sm" className={role === 'admin' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200'} />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="text-xs font-bold text-uni-text-900 truncate uppercase tracking-wide">{user?.name || 'Usuário'}</span>
                <Badge variant="secondary" size="sm" className="text-[9px] px-1 py-0">{roleLabel}</Badge>
              </div>
              <span className="text-[10px] text-uni-text-600 truncate">{role === 'admin' ? 'Sistema UniHER' : (user?.email || '')}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
