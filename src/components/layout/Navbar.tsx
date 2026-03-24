'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
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
    <header role="banner" className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
      <div className={styles.inner}>
        <a href="#" className={styles.logo}>
          <Image src="/logo-uniher.png" alt="UniHER" width={130} height={52} priority className="object-contain" style={{ width: 130, height: 'auto' }} />
        </a>
        <nav role="navigation" aria-label="Navegação principal" className={styles.links}>
          {NAV_SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={activeSection === id ? styles.linkActive : ''}
            >
              {LABELS[id]}
            </a>
          ))}
        </nav>
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
        <nav role="navigation" aria-label="Menu mobile" className={styles.mobileMenu}>
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
        </nav>
      )}
    </header>
  );
}
