'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import styles from './analytics.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

const fetcher = (url: string) => fetch(url).then(r => r.json());

const PERIODS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
] as const;

interface AnalyticsData {
  period: number;
  kpis: {
    invitesSent: number;
    notificationsCreated: number;
    alertsSent: number;
    acceptRate: number;
  };
  invitesByStatus: Record<string, number>;
  notificationsByType: { type: string; count: number }[];
  activityByAction: { action: string; count: number }[];
  timeline: { day: string; count: number }[];
}

export default function AnalyticsCommunicationsPage() {
  const [activePeriod, setActivePeriod] = useState<number>(30);

  const { data, isLoading } = useSWR<AnalyticsData>(
    `/api/analytics/communications?period=${activePeriod}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const kpis = useMemo(() => {
    if (!data) return [];
    const k = data.kpis;
    return [
      { icon: '\u{1F4E8}', value: String(k.invitesSent), label: 'Convites Enviados', sub: `ultimos ${activePeriod} dias` },
      { icon: '\u{1F514}', value: String(k.notificationsCreated), label: 'Notificacoes Criadas', sub: `ultimos ${activePeriod} dias` },
      { icon: '\u{26A0}\uFE0F', value: String(k.alertsSent), label: 'Alertas Enviados', sub: `ultimos ${activePeriod} dias` },
      { icon: '\u{2705}', value: `${k.acceptRate}%`, label: 'Taxa de Aceitacao', sub: 'convites aceitos / total' },
    ];
  }, [data, activePeriod]);

  const timeline = data?.timeline ?? [];

  const lineData = useMemo(() => ({
    labels: timeline.map(t => t.day),
    datasets: [
      {
        label: 'Notificacoes',
        data: timeline.map(t => t.count),
        borderColor: '#C9A264',
        backgroundColor: 'rgba(200, 92, 126, 0.08)',
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#C9A264',
        tension: 0.35,
        fill: true,
      },
    ],
  }), [timeline]);

  const maxY = Math.max(...timeline.map(t => t.count), 5);

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
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#A48090', font: { size: 11 }, maxTicksLimit: 15 },
      },
      y: {
        min: 0,
        max: maxY + Math.ceil(maxY * 0.2),
        grid: { color: 'rgba(180,130,150,0.1)' },
        ticks: { color: '#A48090', font: { size: 11 } },
      },
    },
  }), [maxY]);

  const notifByType = data?.notificationsByType ?? [];
  const activityByAction = data?.activityByAction ?? [];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <h1 className={styles.pageTitle}>Analytics de Comunicacao</h1>
          <p className={styles.pageSubtitle}>Metricas de convites, notificacoes e atividades</p>
        </div>
        <div className={styles.periodBtns}>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`${styles.periodBtn} ${activePeriod === p.value ? styles.periodBtnActive : ''}`}
              onClick={() => setActivePeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className={styles.kpiRow}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={styles.kpiCard} style={{ opacity: 0.5 }}>
              <span className={styles.kpiValue}>--</span>
              <span className={styles.kpiLabel}>Carregando...</span>
            </div>
          ))}
        </div>
      )}

      {!isLoading && data && (
        <>
          {/* KPI Cards */}
          <div className={styles.kpiRow}>
            {kpis.map((kpi) => (
              <div key={kpi.label} className={styles.kpiCard}>
                <span className={styles.kpiIcon}>{kpi.icon}</span>
                <span className={styles.kpiValue}>{kpi.value}</span>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <span className={styles.kpiSub}>{kpi.sub}</span>
              </div>
            ))}
          </div>

          {/* Timeline Chart */}
          <div className={styles.chartsRow}>
            <div className={styles.chartCard} style={{ gridColumn: '1 / -1' }}>
              <h2 className={styles.chartTitle}>Notificacoes ao Longo do Tempo</h2>
              {timeline.length > 0 ? (
                <div className={styles.chartWrapper}>
                  <Line data={lineData} options={lineOptions} />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-400)' }}>
                  <p style={{ fontSize: '2rem', marginBottom: 8 }}>📊</p>
                  <p style={{ fontWeight: 600 }}>Sem dados no periodo</p>
                  <p style={{ fontSize: '0.85rem' }}>Nenhuma notificacao encontrada nos ultimos {activePeriod} dias.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tables: Notifications by Type + Activity by Action */}
          <div className={styles.chartsRow}>
            <div className={styles.tableCard}>
              <h2 className={styles.tableTitle}>Notificacoes por Tipo</h2>
              {notifByType.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifByType.map((n) => (
                      <tr key={n.type}>
                        <td className={styles.campaignName}>{n.type}</td>
                        <td>{n.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-400)', fontSize: '0.85rem' }}>Sem dados no periodo</p>
              )}
            </div>

            <div className={styles.tableCard}>
              <h2 className={styles.tableTitle}>Atividades por Acao</h2>
              {activityByAction.length > 0 ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Acao</th>
                      <th>Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityByAction.map((a) => (
                      <tr key={a.action}>
                        <td className={styles.campaignName}>{a.action}</td>
                        <td>{a.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-400)', fontSize: '0.85rem' }}>Sem dados no periodo</p>
              )}
            </div>
          </div>
        </>
      )}

      {!isLoading && !data && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-400)' }}>
          <p style={{ fontSize: '3rem', marginBottom: 12 }}>📡</p>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-600)' }}>Erro ao carregar dados</p>
          <p style={{ fontSize: '0.85rem' }}>Verifique sua conexao e tente novamente.</p>
        </div>
      )}
    </div>
  );
}
