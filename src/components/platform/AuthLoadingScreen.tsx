import Image from 'next/image';
import styles from './AppLayout.module.css';

export default function AuthLoadingScreen() {
  return (
    <div
      className={`platform-surface ${styles.loadingScreen}`}
      role="status"
      aria-label="Carregando sua área UniHER"
    >
      <div className={styles.loadingCard}>
        <Image
          src="/logo-uniher.png"
          alt="UniHER"
          width={160}
          height={132}
          className={styles.loadingLogo}
          priority
        />
        <div className={styles.loadingSkeleton} aria-hidden="true">
          <span className={styles.loadingLine} />
          <span className={`${styles.loadingLine} ${styles.loadingLineMedium}`} />
          <span className={`${styles.loadingLine} ${styles.loadingLineShort}`} />
        </div>
      </div>
    </div>
  );
}
