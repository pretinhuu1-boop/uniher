'use client';
import { useState, useEffect, useCallback } from 'react';
import styles from './Navbar.module.css';

const NAV_SECTIONS = ['profiles', 'gamification', 'roi', 'campanhas'] as const;
const MOBILE_SECTIONS = ['profiles', 'howitworks', 'gamification', 'roi', 'campanhas', 'ciencia'] as const;

const LABELS: Record<string, string> = {
  profiles: 'Perfis',
  howitworks: 'Como funciona',
  gamification: 'Gamificação',
  roi: 'ROI',
  campanhas: 'Campanhas',
  ciencia: 'Ciência',
};

interface NavbarProps {
  onQuizOpen: () => void;
}

export default function Navbar({ onQuizOpen }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  const closeMenu = () => setMenuOpen(false);

  const updateState = useCallback(() => {
    setScrolled(window.scrollY > 16);

    const offset = 120;
    let current = '';
    for (const id of [...NAV_SECTIONS]) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top <= offset) {
        current = id;
      }
    }
    setActiveSection(current);
  }, []);

  useEffect(() => {
    updateState();
    window.addEventListener('scroll', updateState, { passive: true });
    return () => window.removeEventListener('scroll', updateState);
  }, [updateState]);

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={styles.inner}>
        <a href="#" className={styles.logo}>
          <svg width="30" height="30" viewBox="0 0 36 36" fill="none">
            <path d="M18 32C18 32 8 24 8 15C8 11 11 8 14.5 8C16.5 8 17.5 9.5 18 11C18.5 9.5 19.5 8 21.5 8C25 8 28 11 28 15C28 24 18 32 18 32Z" fill="#F9EEF3" stroke="#C85C7E" strokeWidth="1.4" strokeLinejoin="round"/>
            <path d="M18 30C18 30 10.5 22 12 13.5C13 9 15.5 6.5 18 6C20.5 6.5 23 9 24 13.5C25.5 22 18 30 18 30Z" fill="#EAB8CB" stroke="#C85C7E" strokeWidth="0.9"/>
            <circle cx="18" cy="6" r="1.5" fill="#B8922A"/>
          </svg>
          <div>
            <div className={styles.logoText}>UniHER</div>
            <div className={styles.logoSub}>Saúde Feminina</div>
          </div>
        </a>
        <div className={styles.links}>
          {NAV_SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? styles.linkActive : ''}
            >
              {LABELS[id]}
            </a>
          ))}
        </div>
        <div className={styles.ctaGroup}>
          <a className={styles.ctaOutline} href="/welcome">Acessar Plataforma</a>
          <button className={styles.cta} onClick={onQuizOpen}>Diagnóstico Gratuito</button>
        </div>

        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen : ''}`} />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          {MOBILE_SECTIONS.map((id) => (
            <a key={id} href={`#${id}`} onClick={closeMenu}>
              {LABELS[id]}
            </a>
          ))}
          <a href="/welcome" className={styles.mobileAccess} onClick={closeMenu}>
            Acessar Plataforma →
          </a>
          <button className={styles.mobileCta} onClick={() => { closeMenu(); onQuizOpen(); }}>
            Diagnóstico Gratuito
          </button>
        </div>
      )}
    </nav>
  );
}
