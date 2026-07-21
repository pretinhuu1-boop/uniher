'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { ScrollToTop } from '@/components/ui/ScrollToTop';
import ReminderPopup from './ReminderPopup';
import AuthLoadingScreen from './AuthLoadingScreen';
import MobileTopbar from './MobileTopbar';
import MobileBottomNav, { isCommunityManagementPath } from './MobileBottomNav';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { isLoading, user } = useAuth();
  const pathname = usePathname();
  const hasCollaboratorCapability = user?.role === 'colaboradora' || Boolean(user?.also_collaborator);
  const showCollaboratorMobileNav = hasCollaboratorCapability && !isCommunityManagementPath(pathname);

  const closeNavigation = useCallback(() => {
    setSidebarOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  if (isLoading) return <AuthLoadingScreen />;

  return (
    <div className={`platform-surface ${styles.layout}`}>
      <Sidebar isOpen={sidebarOpen} onClose={closeNavigation} />
      <ReminderPopup />

      <div
        className={`${styles.workspace} ${showCollaboratorMobileNav ? styles.workspaceWithMobileNav : ''}`}
        inert={sidebarOpen ? true : undefined}
      >
        <MobileTopbar
          ref={menuButtonRef}
          title={title}
          onOpenNavigation={() => setSidebarOpen(true)}
        />
        <main id="main-content" tabIndex={-1} className={styles.mainContent}>
          {children}
        </main>
        {showCollaboratorMobileNav ? <MobileBottomNav /> : null}
      </div>
      <ScrollToTop />
    </div>
  );
}
