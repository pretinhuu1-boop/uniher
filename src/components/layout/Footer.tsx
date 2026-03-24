import Image from 'next/image';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.logo}>
          <Image src="/logo-uniher.png" alt="UniHER" width={100} height={80} className="object-contain" style={{ width: 100, height: 'auto' }} />
        </div>
        <div className={styles.sub}>Saúde Feminina Corporativa</div>
        <div className={styles.links}>
          <a href="#profiles">Perfis</a>
          <a href="#howitworks">Como funciona</a>
          <a href="#gamification">Gamificação</a>
          <a href="#roi">Para RH</a>
          <a href="#campanhas">Campanhas</a>
          <a href="#ciencia">Ciência</a>
          <a href="#diagnostico">Diagnóstico</a>
        </div>
        <div className={styles.copy}>&copy; 2026 UniHER. Todos os direitos reservados.</div>
      </div>
    </footer>
  );
}
