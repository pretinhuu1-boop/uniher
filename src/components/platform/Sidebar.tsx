'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './Sidebar.module.css';

type NavItem = { href: string; label: string; icon: string };

const NAV_ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  rh: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/semaforo', label: 'Semáforo de Saúde', icon: 'semaforo' },
    { href: '/campanhas', label: 'Campanhas', icon: 'campanhas' },
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
  ],
};

const ROLE_LABELS: Record<string, string> = {
  rh: 'RH',
  lideranca: 'Liderança',
  colaboradora: 'Colaboradora',
};

const BOTTOM_ITEMS = [
  { href: '/configuracoes', label: 'Configurações', icon: 'config' },
];

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="7" height="7" rx="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" />
      </svg>
    ),
    semaforo: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" />
        <path d="M10 6V10L13 13" />
      </svg>
    ),
    campanhas: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="14" height="14" rx="2" />
        <path d="M3 8H17" />
        <path d="M7 2V5" />
        <path d="M13 2V5" />
      </svg>
    ),
    desafios: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="5" />
        <circle cx="10" cy="10" r="2" />
      </svg>
    ),
    conquistas: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2L12.5 7.5L18 8L14 12L15 18L10 15L5 18L6 12L2 8L7.5 7.5L10 2Z" />
      </svg>
    ),
    historico: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 18C14.4 18 18 14.4 18 10C18 5.6 14.4 2 10 2C5.6 2 2 5.6 2 10C2 14.4 5.6 18 10 18Z" />
        <path d="M10 6V10L7 13" />
      </svg>
    ),
    profile: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="7" r="4" />
        <path d="M3 18C3 14.134 6.13401 11 10 11C13.866 11 17 14.134 17 18" />
      </svg>
    ),
    notifications: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 7C15 4.23858 12.7614 2 10 2C7.23858 2 5 4.23858 5 7C5 13 2 15 2 15H18C18 15 15 13 15 7Z" />
        <path d="M11.5 18C11.2 18.6 10.6 19 10 19C9.4 19 8.8 18.6 8.5 18" />
      </svg>
    ),
    analytics: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="10" width="3" height="8" rx="1" />
        <rect x="8.5" y="6" width="3" height="12" rx="1" />
        <rect x="15" y="2" width="3" height="16" rx="1" />
      </svg>
    ),
    config: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="3" />
        <path d="M10 1.5V4M10 16V18.5M18.5 10H16M4 10H1.5M16 4L14 6M6 14L4 16M16 16L14 14M6 6L4 4" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17H4C3.44772 17 3 16.5523 3 16V4C3 3.44772 3.44772 3 4 3H7" />
        <path d="M14 14L18 10L14 6" />
        <path d="M18 10H7" />
      </svg>
    ),
  };
  return <span className={styles.navIcon}>{icons[name] || icons.dashboard}</span>;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const role = user?.role || 'colaboradora';
  const navItems = NAV_ITEMS_BY_ROLE[role] || NAV_ITEMS_BY_ROLE.colaboradora;
  const roleLabel = ROLE_LABELS[role] || 'Colaboradora';

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'UN';

  return (
    <>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* Brand */}
        <div className={styles.brand}>
          <svg className={styles.brandLogo} viewBox="0 0 36 36" fill="none">
            <path d="M18 32C18 32 8 24 8 15C8 11 11 8 14.5 8C16.5 8 17.5 9.5 18 11C18.5 9.5 19.5 8 21.5 8C25 8 28 11 28 15C28 24 18 32 18 32Z" fill="#F9EEF3" stroke="#C85C7E" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M18 30C18 30 10.5 22 12 13.5C13 9 15.5 6.5 18 6C20.5 6.5 23 9 24 13.5C25.5 22 18 30 18 30Z" fill="#EAB8CB" stroke="#C85C7E" strokeWidth="0.9"/>
            <circle cx="18" cy="6" r="1.5" fill="#B8922A"/>
          </svg>
          <div className={styles.brandInfo}>
            <span className={styles.brandName}>UniHer</span>
            <span className={styles.brandSub}>Saúde Feminina</span>
          </div>
        </div>

        {/* Navigation Label */}
        <div className={styles.navSection}>
          <div className={styles.navLabel}>Principal</div>
        </div>

        {/* Nav Items */}
        <div className={styles.navList}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
              onClick={onClose}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          ))}

          {/* Notifications */}
          <Link
            href="/notificacoes"
            className={`${styles.navItem} ${pathname === '/notificacoes' ? styles.navItemActive : ''}`}
            onClick={onClose}
          >
            <NavIcon name="notifications" />
            Notificações
            <span className={styles.navBadge}>2</span>
          </Link>

          {BOTTOM_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
              onClick={onClose}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          ))}

          {/* Logout */}
          <button
            className={styles.navItem}
            onClick={() => { logout(); window.location.href = '/'; }}
          >
            <NavIcon name="logout" />
            Sair da Conta
          </button>
        </div>

        {/* User Card */}
        <div className={styles.bottomSection}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {user?.name || 'Usuário'}
                <span className={styles.roleBadge}>{roleLabel}</span>
              </div>
              <div className={styles.userEmail}>{user?.email || ''}</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
