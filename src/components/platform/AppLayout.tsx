'use client';
import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import styles from './AppLayout.module.css';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className={styles.main}>
        {/* Mobile topbar */}
        <div className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6H21M3 12H21M3 18H21" />
            </svg>
          </button>
          {title && <span className={styles.topbarTitle}>{title}</span>}
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
