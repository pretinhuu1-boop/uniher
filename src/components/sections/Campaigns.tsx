import RevealOnScroll from '@/components/ui/RevealOnScroll';
import Badge from '@/components/ui/Badge';
import { CAMPAIGNS } from '@/data/campaigns';
import styles from './Campaigns.module.css';

export default function Campaigns() {
  const gridCampaigns = CAMPAIGNS.filter((c) => c.status !== 'next');
  const nextCampaign = CAMPAIGNS.find((c) => c.status === 'next');

  return (
    <section className={styles.section} id="campanhas">
      <div className={styles.container}>
        <RevealOnScroll>
          <span className={styles.eyebrow}>Calendário de saúde</span>
          <h2 className={styles.title}>Campanhas que movem a empresa inteira</h2>
        </RevealOnScroll>

        <RevealOnScroll>
          <div className={styles.grid}>
            {gridCampaigns.map((campaign) => (
              <div key={campaign.name} className={styles.card}>
                <span className={styles.month}>{campaign.month}</span>
                <h3 className={styles.campaignName}>{campaign.name}</h3>

                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${campaign.progress}%`,
                      background: campaign.color,
                    }}
                  />
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.percentage}>{campaign.progress}%</span>
                  <Badge status={campaign.status}>{campaign.statusLabel}</Badge>
                </div>
              </div>
            ))}
          </div>
        </RevealOnScroll>

        {nextCampaign && (
          <RevealOnScroll>
            <div className={styles.nextCard}>
              <div className={styles.nextIcon}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className={styles.nextContent}>
                <span className={styles.nextLabel}>Próxima campanha</span>
                <h3 className={styles.nextName}>
                  Janeiro Branco &mdash; Saude Mental
                </h3>
                <p className={styles.nextDesc}>
                  Campanha focada em conscientização sobre saúde mental e
                  bem-estar emocional no ambiente de trabalho.
                </p>
              </div>
              <Badge status="next">{nextCampaign.statusLabel}</Badge>
            </div>
          </RevealOnScroll>
        )}
      </div>
    </section>
  );
}
