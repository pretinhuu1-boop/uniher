'use client';

import { useState } from 'react';
import { CAMPAIGNS_DASHBOARD } from '@/data/mock-dashboard';
import type { CampaignStatus } from '@/types/platform';
import styles from './campanhas.module.css';

const TEMAS = ['Saúde Mental', 'Prevenção', 'Hábitos', 'Nutrição'] as const;
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

const THEME_COLORS: Record<string, string> = {
  'Saúde Mental': '#A48090',
  'Prevenção': '#C85C7E',
  'Hábitos': '#3E7D5A',
  'Nutrição': '#EF9F27',
};

type FilterTab = 'all' | 'active' | 'done' | 'next';

const MOCK_DESCRIPTIONS: Record<string, string> = {
  'Outubro Rosa': 'Campanha de conscientização sobre a prevenção do câncer de mama, com atividades educativas, exames preventivos e rodas de conversa sobre saúde feminina.',
  'Novembro Azul': 'Foco na saúde masculina e prevenção do câncer de próstata, com palestras, check-ups e desafios de bem-estar para os colaboradores.',
  'Dezembro Laranja': 'Prevenção e controle do diabetes, com orientação nutricional, monitoramento de glicemia e atividades físicas em grupo.',
  'Janeiro Branco': 'Promoção da saúde mental e emocional, com sessões de mindfulness, apoio psicológico e workshops sobre equilíbrio vida-trabalho.',
};

function badgeClass(status: string) {
  if (status === 'done') return styles.badgeDone;
  if (status === 'active') return styles.badgeActive;
  return styles.badgeNext;
}

export default function CampanhasPage() {
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>(CAMPAIGNS_DASHBOARD);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formTema, setFormTema] = useState<string>(TEMAS[0]);
  const [formMes, setFormMes] = useState<string>(MESES[0]);
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({});
  const [detailOpen, setDetailOpen] = useState<string | null>(null);

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return c.status === 'active';
    if (activeFilter === 'done') return c.status === 'done';
    return c.status === 'next';
  });

  function handleCardClick(name: string) {
    setExpandedCard(expandedCard === name ? null : name);
  }

  function handleCreateCampaign() {
    if (!formName.trim()) return;
    const newCampaign: CampaignStatus = {
      name: formName.trim(),
      month: `${formMes} · ${formTema}`,
      progress: 0,
      status: 'next',
      statusLabel: 'Próxima',
      color: THEME_COLORS[formTema] || '#A48090',
    };
    setCampaigns([...campaigns, newCampaign]);
    setFormName('');
    setFormTema(TEMAS[0]);
    setFormMes(MESES[0]);
    setShowForm(false);
  }

  function handleAction(campaignName: string, action: 'detalhes' | 'compartilhar') {
    if (action === 'detalhes') {
      setActionFeedback((prev) => ({ ...prev, [campaignName]: 'loading' }));
      setTimeout(() => {
        setActionFeedback((prev) => {
          const next = { ...prev };
          delete next[campaignName];
          return next;
        });
        setDetailOpen(campaignName);
      }, 1500);
    } else {
      setActionFeedback((prev) => ({ ...prev, [`${campaignName}-share`]: 'copied' }));
      setTimeout(() => {
        setActionFeedback((prev) => {
          const next = { ...prev };
          delete next[`${campaignName}-share`];
          return next;
        });
      }, 2000);
    }
  }

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'active', label: 'Ativas' },
    { key: 'done', label: 'Finalizadas' },
    { key: 'next', label: 'Próximas' },
  ];

  return (
    <div className={styles.page}>
      {/* Header row */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Campanhas</h1>
          <p className={styles.subtitle}>
            Campanhas de saúde temáticas para engajar colaboradoras
          </p>
        </div>
        <button
          className={styles.newCampaignBtn}
          onClick={() => setShowForm(true)}
        >
          + Nova Campanha
        </button>
      </div>

      {/* New Campaign Form */}
      {showForm && (
        <div className={styles.formOverlay}>
          <div className={styles.formCard}>
            <h2 className={styles.formTitle}>Nova Campanha</h2>

            <label className={styles.formLabel}>
              Nome da campanha
              <input
                type="text"
                className={styles.formInput}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Fevereiro Roxo"
                autoFocus
              />
            </label>

            <label className={styles.formLabel}>
              Tema
              <select
                className={styles.formSelect}
                value={formTema}
                onChange={(e) => setFormTema(e.target.value)}
              >
                {TEMAS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className={styles.formLabel}>
              Mês
              <select
                className={styles.formSelect}
                value={formMes}
                onChange={(e) => setFormMes(e.target.value)}
              >
                {MESES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <div className={styles.formActions}>
              <button
                className={styles.formCancelBtn}
                onClick={() => {
                  setShowForm(false);
                  setFormName('');
                }}
              >
                Cancelar
              </button>
              <button
                className={styles.formCreateBtn}
                onClick={handleCreateCampaign}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.filterTab} ${activeFilter === tab.key ? styles.filterTabActive : ''}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className={styles.list}>
        {filteredCampaigns.length === 0 && (
          <p className={styles.emptyMsg}>Nenhuma campanha encontrada neste filtro.</p>
        )}
        {filteredCampaigns.map((campaign) => (
          <div key={campaign.name} className={styles.cardWrapper}>
            <div
              className={`${styles.card} ${expandedCard === campaign.name ? styles.cardExpanded : ''}`}
              onClick={() => handleCardClick(campaign.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(campaign.name);
                }
              }}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardInfo}>
                  <span className={styles.monthTag}>{campaign.month}</span>
                  <span className={styles.campaignName}>{campaign.name}</span>
                </div>
                <span className={`${styles.badge} ${badgeClass(campaign.status)}`}>
                  {campaign.statusLabel}
                </span>
              </div>
              <div className={styles.progressRow}>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${campaign.progress}%`,
                      background: campaign.color,
                    }}
                  />
                </div>
                <span className={styles.progressLabel}>{campaign.progress}%</span>
              </div>
            </div>

            {/* Expanded Detail Panel */}
            {expandedCard === campaign.name && (
              <div className={styles.detailPanel}>
                <p className={styles.detailDescription}>
                  {MOCK_DESCRIPTIONS[campaign.name] ||
                    `Campanha temática de ${campaign.month.split('·')[1]?.trim() || 'saúde'}, com atividades interativas, conteúdo educativo e metas de engajamento para todas as colaboradoras.`}
                </p>
                <div className={styles.statsRow}>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>324</span>
                    <span className={styles.statLabel}>Participantes</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>500</span>
                    <span className={styles.statLabel}>Meta</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statValue}>01/10</span>
                    <span className={styles.statLabel}>Início</span>
                  </div>
                </div>
                <div className={styles.detailActions}>
                  <button
                    className={styles.detailBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(campaign.name, 'detalhes');
                    }}
                  >
                    {actionFeedback[campaign.name] === 'loading' ? 'Carregando...' : 'Ver detalhes'}
                  </button>
                  <button
                    className={styles.detailBtnSecondary}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction(campaign.name, 'compartilhar');
                    }}
                  >
                    {actionFeedback[`${campaign.name}-share`] === 'copied'
                      ? '\u2713 Link copiado!'
                      : 'Compartilhar'}
                  </button>
                </div>

                {/* Full Campaign Detail */}
                {detailOpen === campaign.name && (
                  <div className={styles.fullDetail}>
                    <h3 className={styles.fullDetailTitle}>Detalhes da Campanha</h3>
                    <p className={styles.fullDetailObjective}>
                      {MOCK_DESCRIPTIONS[campaign.name] ||
                        `Campanha temática de ${campaign.month.split('·')[1]?.trim() || 'saúde'}, com atividades interativas, conteúdo educativo e metas de engajamento para todas as colaboradoras.`}
                    </p>

                    <div className={styles.fullDetailMeta}>
                      <div className={styles.fullDetailMetaItem}>
                        <span className={styles.fullDetailMetaLabel}>Periodo</span>
                        <span className={styles.fullDetailMetaValue}>01/10 - 31/10</span>
                      </div>
                      <div className={styles.fullDetailMetaItem}>
                        <span className={styles.fullDetailMetaLabel}>Participacao</span>
                        <span className={styles.fullDetailMetaValue}>65%</span>
                      </div>
                      <div className={styles.fullDetailMetaItem}>
                        <span className={styles.fullDetailMetaLabel}>Satisfacao</span>
                        <span className={styles.fullDetailMetaValue}>4.2/5</span>
                      </div>
                      <div className={styles.fullDetailMetaItem}>
                        <span className={styles.fullDetailMetaLabel}>Acoes completadas</span>
                        <span className={styles.fullDetailMetaValue}>892</span>
                      </div>
                    </div>

                    <div className={styles.activityList}>
                      <h4 className={styles.activityListTitle}>Atividades</h4>
                      <ul className={styles.activityItems}>
                        <li className={styles.activityItem}>Palestra: Prevencao ao Cancer de Mama - 234 participantes</li>
                        <li className={styles.activityItem}>Quiz: Autoexame - 456 completadas</li>
                        <li className={styles.activityItem}>Roda de Conversa: Saude Feminina - 128 participantes</li>
                        <li className={styles.activityItem}>Desafio: 30 dias de autocuidado - 74 inscritas</li>
                      </ul>
                    </div>

                    <button
                      className={styles.closeDetailBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailOpen(null);
                      }}
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
