import Link from 'next/link';

import type { DashboardAction } from '../dashboard-view-model';
import styles from '../dashboard.module.css';

export function NextActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <section className={styles.surface} aria-label="Próximas ações">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Atalhos</p>
          <h2 className={styles.sectionTitle}>Próximas ações</h2>
          <p className={styles.sectionDescription}>Continue pelos fluxos mais frequentes do RH.</p>
        </div>
      </div>
      <ul className={styles.actionList}>
        {actions.map((action) => (
          <li key={action.href}>
            <Link className={styles.actionLink} href={action.href}>
              <span>
                <strong>{action.label}</strong>
                <small>{action.description}</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
