'use client';

import { forwardRef } from 'react';
import styles from './AppLayout.module.css';

export interface MobileTopbarProps {
  title?: string;
  onOpenNavigation: () => void;
}

const MobileTopbar = forwardRef<HTMLButtonElement, MobileTopbarProps>(
  function MobileTopbar({ title, onOpenNavigation }, ref) {
    return (
      <header className={styles.mobileTopbar}>
        <button
          ref={ref}
          type="button"
          className={styles.mobileMenuButton}
          onClick={onOpenNavigation}
          aria-label="Abrir navegação"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        {title ? <h1 className={styles.mobileTitle}>{title}</h1> : null}
      </header>
    );
  },
);

export default MobileTopbar;
