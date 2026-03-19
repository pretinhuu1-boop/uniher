'use client';

import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

import styles from './analytics.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

/* ── Mock Data by Period ── */

const PERIODS = ['7 dias', '30 dias', '90 dias'] as const;

type KpiItem = { icon: string; value: string; label: string; sub: string; trend: string | null };

const KPIS_BY_PERIOD: Record<string, KpiItem[]> = {
  '7 dias': [
    { icon: '\u{1F4E7}', value: '312', label: 'Emails Enviados', sub: 'ultimos 7 dias', trend: null },
    { icon: '\u{1F4EC}', value: '72%', label: 'Taxa de Abertura', sub: '\u2191 +8% vs periodo anterior', trend: 'up' },
    { icon: '\u{1F5B1}\uFE0F', value: '38%', label: 'Taxa de Clique', sub: '\u2191 +5% vs periodo anterior', trend: 'up' },
    { icon: '\u{1F6AB}', value: '1.8%', label: 'Taxa de Bounce', sub: '\u2193 -0.3% vs periodo anterior', trend: 'down' },
  ],
  '30 dias': [
    { icon: '\u{1F4E7}', value: '1.247', label: 'Emails Enviados', sub: 'ultimos 30 dias', trend: null },
    { icon: '\u{1F4EC}', value: '68%', label: 'Taxa de Abertura', sub: '\u2191 +5% vs periodo anterior', trend: 'up' },
    { icon: '\u{1F5B1}\uFE0F', value: '34%', label: 'Taxa de Clique', sub: '\u2191 +3% vs periodo anterior', trend: 'up' },
    { icon: '\u{1F6AB}', value: '2.1%', label: 'Taxa de Bounce', sub: '\u2193 -0.5% vs periodo anterior', trend: 'down' },
  ],
  '90 dias': [
    { icon: '\u{1F4E7}', value: '3.842', label: 'Emails Enviados', sub: 'ultimos 90 dias', trend: null },
    { icon: '\u{1F4EC}', value: '63%', label: 'Taxa de Abertura', sub: '\u2191 +2% vs periodo anterior', trend: 'up' },
    { icon: '\u{1F5B1}\uFE0F', value: '29%', label: 'Taxa de Clique', sub: '\u2193 -1% vs periodo anterior', trend: 'down' },
    { icon: '\u{1F6AB}', value: '2.6%', label: 'Taxa de Bounce', sub: '\u2191 +0.2% vs periodo anterior', trend: 'up' },
  ],
};

const OPEN_RATE_BY_PERIOD: Record<string, { labels: string[]; data: number[]; yMin: number; yMax: number }> = {
  '7 dias': {
    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'],
    data: [68, 70, 72, 71, 74, 65, 62],
    yMin: 55,
    yMax: 80,
  },
  '30 dias': {
    labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`),
    data: [
      60, 61, 59, 62, 63, 61, 64, 63, 65, 64,
      66, 65, 67, 66, 68, 67, 65, 66, 68, 69,
      67, 68, 70, 69, 68, 69, 70, 71, 69, 70,
    ],
    yMin: 50,
    yMax: 80,
  },
  '90 dias': {
    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8', 'Sem 9', 'Sem 10', 'Sem 11', 'Sem 12', 'Sem 13'],
    data: [55, 57, 58, 60, 59, 61, 62, 63, 61, 64, 65, 63, 66],
    yMin: 45,
    yMax: 75,
  },
};

const HOUR_LABELS = [
  '6h', '7h', '8h', '9h', '10h', '11h', '12h',
  '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h',
];

const HOUR_DATA_BY_PERIOD: Record<string, number[]> = {
  '7 dias': [15, 28, 75, 48, 40, 32, 70, 38, 30, 34, 32, 38, 68, 42, 20],
  '30 dias': [12, 25, 72, 45, 38, 30, 68, 35, 28, 32, 30, 35, 65, 40, 18],
  '90 dias': [10, 22, 68, 42, 35, 28, 64, 32, 26, 30, 28, 32, 60, 36, 15],
};

const CAMPAIGNS_BY_PERIOD: Record<string, { name: string; enviados: number; aberturas: number; aberturasPct: string; cliques: number; cliquesPct: string; taxa: string }[]> = {
  '7 dias': [
    { name: 'Janeiro Branco', enviados: 312, aberturas: 225, aberturasPct: '72%', cliques: 118, cliquesPct: '38%', taxa: 'Alta' },
  ],
  '30 dias': [
    { name: 'Outubro Rosa', enviados: 812, aberturas: 587, aberturasPct: '72%', cliques: 245, cliquesPct: '30%', taxa: 'Alta' },
    { name: 'Novembro Azul', enviados: 798, aberturas: 542, aberturasPct: '68%', cliques: 198, cliquesPct: '25%', taxa: 'Media' },
    { name: 'Dezembro Laranja', enviados: 825, aberturas: 536, aberturasPct: '65%', cliques: 176, cliquesPct: '21%', taxa: 'Media' },
    { name: 'Janeiro Branco', enviados: 810, aberturas: 510, aberturasPct: '63%', cliques: 162, cliquesPct: '20%', taxa: 'Baixa' },
  ],
  '90 dias': [
    { name: 'Outubro Rosa', enviados: 812, aberturas: 587, aberturasPct: '72%', cliques: 245, cliquesPct: '30%', taxa: 'Alta' },
    { name: 'Novembro Azul', enviados: 798, aberturas: 542, aberturasPct: '68%', cliques: 198, cliquesPct: '25%', taxa: 'Media' },
    { name: 'Dezembro Laranja', enviados: 825, aberturas: 536, aberturasPct: '65%', cliques: 176, cliquesPct: '21%', taxa: 'Media' },
    { name: 'Janeiro Branco', enviados: 810, aberturas: 510, aberturasPct: '63%', cliques: 162, cliquesPct: '20%', taxa: 'Baixa' },
    { name: 'Setembro Amarelo', enviados: 780, aberturas: 468, aberturasPct: '60%', cliques: 148, cliquesPct: '19%', taxa: 'Baixa' },
    { name: 'Agosto Lilás', enviados: 750, aberturas: 435, aberturasPct: '58%', cliques: 135, cliquesPct: '18%', taxa: 'Baixa' },
  ],
};

const TOP_CONTENT = [
  { title: 'Guia: Exames Preventivos Essenciais', clicks: 156 },
  { title: '5 Dicas para Melhorar o Sono', clicks: 134 },
  { title: 'Meditação em 5 Minutos', clicks: 112 },
  { title: 'Alimentação e Energia no Trabalho', clicks: 98 },
  { title: 'Check-up: Quando Fazer?', clicks: 87 },
];

/* ── Component ── */

export default function AnalyticsEmailsPage() {
  const [activePeriod, setActivePeriod] = useState<string>('30 dias');

  const kpis = KPIS_BY_PERIOD[activePeriod];
  const openRateConfig = OPEN_RATE_BY_PERIOD[activePeriod];
  const hourData = HOUR_DATA_BY_PERIOD[activePeriod];
  const campaigns = CAMPAIGNS_BY_PERIOD[activePeriod];

  /* ── Chart configs ── */
  const lineData = useMemo(() => ({
    labels: openRateConfig.labels,
    datasets: [
      {
        label: 'Taxa de Abertura (%)',
        data: openRateConfig.data,
        borderColor: '#C85C7E',
        backgroundColor: 'rgba(200, 92, 126, 0.08)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#C85C7E',
        tension: 0.35,
        fill: true,
      },
    ],
  }), [openRateConfig]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2A1A1F',
        titleFont: { family: 'DM Sans' },
        bodyFont: { family: 'DM Sans' },
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#A48090', font: { size: 11 } },
      },
      y: {
        min: openRateConfig.yMin,
        max: openRateConfig.yMax,
        grid: { color: 'rgba(180,130,150,0.1)' },
        ticks: {
          color: '#A48090',
          font: { size: 11 },
          callback: (v: string | number) => `${v}%`,
        },
      },
    },
  }), [openRateConfig]);

  const barData = useMemo(() => ({
    labels: HOUR_LABELS,
    datasets: [
      {
        label: 'Taxa de Abertura (%)',
        data: hourData,
        backgroundColor: hourData.map((v) =>
          v >= 60 ? '#C85C7E' : v >= 40 ? '#D4B060' : 'rgba(200,92,126,0.25)'
        ),
        borderRadius: 6,
        borderSkipped: false as const,
      },
    ],
  }), [hourData]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#2A1A1F',
        titleFont: { family: 'DM Sans' },
        bodyFont: { family: 'DM Sans' },
        cornerRadius: 8,
        padding: 10,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) => `${ctx.parsed.y ?? 0}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#A48090', font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 80,
        grid: { color: 'rgba(180,130,150,0.1)' },
        ticks: {
          color: '#A48090',
          font: { size: 11 },
          callback: (v: string | number) => `${v}%`,
        },
      },
    },
  };

  const badgeClass = (taxa: string) => {
    if (taxa === 'Alta') return styles.badgeAlta;
    if (taxa === 'Media') return styles.badgeMedia;
    return styles.badgeBaixa;
  };

  const badgeLabel = (taxa: string) => {
    if (taxa === 'Alta') return 'Alta';
    if (taxa === 'Media') return 'Média';
    return 'Baixa';
  };

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Analytics de Emails</h1>
          <p className={styles.pageSubtitle}>Métricas de engajamento por email</p>
        </div>
        <div className={styles.periodBtns}>
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`${styles.periodBtn} ${activePeriod === p ? styles.periodBtnActive : ''}`}
              onClick={() => setActivePeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className={styles.kpiRow}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpiCard}>
            <span className={styles.kpiIcon}>{kpi.icon}</span>
            <span className={styles.kpiValue}>{kpi.value}</span>
            <span className={styles.kpiLabel}>{kpi.label}</span>
            <span
              className={`${styles.kpiSub} ${
                kpi.trend === 'up' ? styles.kpiUp : kpi.trend === 'down' ? styles.kpiDown : ''
              }`}
            >
              {kpi.sub}
            </span>
          </div>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Abertura ao Longo do Tempo</h2>
          <div className={styles.chartWrapper}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
        <div className={styles.chartCard}>
          <h2 className={styles.chartTitle}>Melhores Horários de Abertura</h2>
          <div className={styles.chartWrapper}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* ── Campaign Table ── */}
      <div className={styles.tableCard}>
        <h2 className={styles.tableTitle}>Desempenho por Campanha</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Campanha</th>
              <th>Enviados</th>
              <th>Aberturas</th>
              <th>Cliques</th>
              <th>Taxa</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name}>
                <td className={styles.campaignName}>{c.name}</td>
                <td>{c.enviados.toLocaleString('pt-BR')}</td>
                <td>
                  {c.aberturas.toLocaleString('pt-BR')}
                  <span className={styles.subValue}>({c.aberturasPct})</span>
                </td>
                <td>
                  {c.cliques.toLocaleString('pt-BR')}
                  <span className={styles.subValue}>({c.cliquesPct})</span>
                </td>
                <td>
                  <span className={`${styles.badge} ${badgeClass(c.taxa)}`}>
                    {badgeLabel(c.taxa)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Top Content ── */}
      <div className={styles.topContentCard}>
        <h2 className={styles.topContentTitle}>Conteúdos Mais Clicados</h2>
        <div className={styles.topContentList}>
          {TOP_CONTENT.map((item, idx) => (
            <div key={item.title} className={styles.topContentItem}>
              <div className={styles.topContentLeft}>
                <span className={styles.topContentRank}>{idx + 1}</span>
                <span className={styles.topContentName}>{item.title}</span>
              </div>
              <span className={styles.topContentClicks}>{item.clicks} cliques</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
