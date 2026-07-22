import Link from 'next/link';

import { FeedbackState } from '@/components/ui/FeedbackState';
import type { CampaignStatus } from '@/types/platform';
import styles from '../dashboard.module.css';

export function CampaignOverview({ campaigns }: { campaigns: CampaignStatus[] }) {
  return (
    <section className={styles.surface} aria-labelledby="campaigns-title">
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Campanhas</p>
          <h3 id="campaigns-title" className={styles.sectionTitle}>Ações da empresa</h3>
        </div>
      </div>
      {campaigns.length === 0 ? (
        <FeedbackState
          kind="empty"
          title="Nenhuma campanha criada"
          description="Crie uma campanha para acompanhar adesão e progresso neste painel."
          action={<Link className={styles.inlineLink} href="/campanhas">Criar campanha</Link>}
        />
      ) : (
        <ul className={styles.dataList}>
          {campaigns.slice(0, 4).map((campaign) => (
            <li key={`${campaign.name}-${campaign.month}`} className={styles.campaignRow}>
              <div className={styles.rowHeading}>
                <strong>{campaign.name}</strong>
                <span>{campaign.statusLabel}</span>
              </div>
              <p>{campaign.month} · {campaign.progress}% concluído</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
