'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Route, UserRound, UsersRound } from 'lucide-react';
import styles from './AppLayout.module.css';

const MOBILE_NAV_ITEMS = [
  { href: '/colaboradora', label: 'Hoje', icon: Home, key: 'today' },
  { href: '/comunidade', label: 'Comunidade', icon: UsersRound, key: 'community' },
  { href: '/colaboradora?focus=journey', label: 'Jornada', icon: Route, key: 'journey' },
  { href: '/configuracoes', label: 'Perfil', icon: UserRound, key: 'profile' },
] as const;

function getActiveKey(pathname: string, focus: string | null) {
  if (pathname === '/comunidade' || pathname.startsWith('/comunidade/')) return 'community';
  if (pathname === '/configuracoes' || pathname.startsWith('/configuracoes/')) return 'profile';
  if (pathname === '/avaliacao-nr1' || focus === 'journey') return 'journey';
  if (pathname === '/colaboradora' || pathname.startsWith('/colaboradora/')) return 'today';
  return null;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeKey = getActiveKey(pathname, searchParams.get('focus'));

  return (
    <nav className={styles.mobileBottomNav} aria-label="Navegacao mobile">
      {MOBILE_NAV_ITEMS.map(({ href, label, icon: Icon, key }) => {
        const isActive = key === activeKey;

        return (
          <Link
            key={key}
            href={href}
            className={`${styles.mobileBottomNavItem} ${isActive ? styles.mobileBottomNavItemActive : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
