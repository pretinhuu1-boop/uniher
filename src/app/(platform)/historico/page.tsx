'use client';

import { useState, useMemo } from 'react';
import styles from './historico.module.css';

const DEPARTMENTS = ['Todos', 'RH', 'Marketing', 'TI', 'Financeiro', 'Comercial', 'Operacoes'];

const DEPT_KEYS = ['rh', 'marketing', 'ti', 'financeiro', 'comercial', 'operacoes'] as const;
type DeptKey = typeof DEPT_KEYS[number];

const DEPT_LABEL_TO_KEY: Record<string, DeptKey> = {
  RH: 'rh',
  Marketing: 'marketing',
  TI: 'ti',
  Financeiro: 'financeiro',
  Comercial: 'comercial',
  Operacoes: 'operacoes',
};

const DEPT_KEY_TO_LABEL: Record<DeptKey, string> = {
  rh: 'RH',
  marketing: 'Marketing',
  ti: 'TI',
  financeiro: 'Financeiro',
  comercial: 'Comercial',
  operacoes: 'Operacoes',
};

interface MonthRow {
  month: string;
  rh: number;
  marketing: number;
  ti: number;
  financeiro: number;
  comercial: number;
  operacoes: number;
}

const MONTHLY_DATA_12: MonthRow[] = [
  { month: 'Jan/26', rh: 30200, marketing: 25500, ti: 24500, financeiro: 20800, comercial: 19500, operacoes: 17200 },
  { month: 'Dez/25', rh: 28100, marketing: 23800, ti: 22700, financeiro: 19200, comercial: 18100, operacoes: 15900 },
  { month: 'Nov/25', rh: 25400, marketing: 21200, ti: 20100, financeiro: 17500, comercial: 16800, operacoes: 14200 },
  { month: 'Out/25', rh: 22000, marketing: 18500, ti: 17800, financeiro: 15300, comercial: 14900, operacoes: 12100 },
  { month: 'Set/25', rh: 18200, marketing: 15100, ti: 14600, financeiro: 12800, comercial: 12200, operacoes: 10400 },
  { month: 'Ago/25', rh: 14500, marketing: 12000, ti: 11200, financeiro: 10100, comercial: 9800, operacoes: 8200 },
  { month: 'Jul/25', rh: 11800, marketing: 9900, ti: 9100, financeiro: 8200, comercial: 7600, operacoes: 6500 },
  { month: 'Jun/25', rh: 9500, marketing: 7800, ti: 7200, financeiro: 6500, comercial: 5900, operacoes: 5100 },
  { month: 'Mai/25', rh: 7200, marketing: 6100, ti: 5500, financeiro: 4800, comercial: 4300, operacoes: 3700 },
  { month: 'Abr/25', rh: 5400, marketing: 4500, ti: 4000, financeiro: 3500, comercial: 3100, operacoes: 2600 },
  { month: 'Mar/25', rh: 3200, marketing: 2700, ti: 2400, financeiro: 2100, comercial: 1800, operacoes: 1500 },
  { month: 'Fev/25', rh: 1500, marketing: 1200, ti: 1100, financeiro: 900, comercial: 800, operacoes: 600 },
];

const RANKING_BADGES: Record<string, string[]> = {
  RH: ['Engajamento Total', 'Lider de Cultura', 'Top Retentor'],
  Marketing: ['Campanha Viral', 'ROI Master', 'Growth Hacker'],
  TI: ['Deploy Perfeito', 'Zero Downtime', 'Code Review Star'],
  Financeiro: ['Orcamento Exemplar', 'Auditoria Impecavel'],
  Comercial: ['Meta Batida', 'Cliente Satisfeito'],
  Operacoes: ['Eficiencia Maxima', 'Processo Otimizado'],
};

const RANKING_DATA_BY_PERIOD: Record<string, { rank: number; dept: string; points: number; trend: string }[]> = {
  '3': [
    { rank: 1, dept: 'RH', points: 30200, trend: 'up' },
    { rank: 2, dept: 'Marketing', points: 25500, trend: 'up' },
    { rank: 3, dept: 'TI', points: 24500, trend: 'stable' },
    { rank: 4, dept: 'Financeiro', points: 20800, trend: 'up' },
    { rank: 5, dept: 'Comercial', points: 19500, trend: 'down' },
    { rank: 6, dept: 'Operacoes', points: 17200, trend: 'down' },
  ],
  '6': [
    { rank: 1, dept: 'RH', points: 30200, trend: 'up' },
    { rank: 2, dept: 'Marketing', points: 25500, trend: 'up' },
    { rank: 3, dept: 'TI', points: 24500, trend: 'up' },
    { rank: 4, dept: 'Financeiro', points: 20800, trend: 'up' },
    { rank: 5, dept: 'Comercial', points: 19500, trend: 'stable' },
    { rank: 6, dept: 'Operacoes', points: 17200, trend: 'down' },
  ],
  '12': [
    { rank: 1, dept: 'RH', points: 30200, trend: 'up' },
    { rank: 2, dept: 'TI', points: 24500, trend: 'up' },
    { rank: 3, dept: 'Marketing', points: 25500, trend: 'up' },
    { rank: 4, dept: 'Financeiro', points: 20800, trend: 'up' },
    { rank: 5, dept: 'Operacoes', points: 17200, trend: 'up' },
    { rank: 6, dept: 'Comercial', points: 19500, trend: 'stable' },
  ],
};

type ViewTab = 'pontos' | 'ranking';
type SortDir = 'asc' | 'desc' | null;

export default function HistoricoPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('pontos');
  const [selectedDept, setSelectedDept] = useState('Todos');
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [downloadLabel, setDownloadLabel] = useState('Baixar');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<DeptKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [expandedRankCard, setExpandedRankCard] = useState<string | null>(null);

  const monthlyDataSliced = MONTHLY_DATA_12.slice(0, Number(selectedPeriod));
  const rankingData = RANKING_DATA_BY_PERIOD[selectedPeriod] ?? RANKING_DATA_BY_PERIOD['6'];

  // Filter by search term (month name)
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return monthlyDataSliced;
    const term = searchTerm.toLowerCase();
    return monthlyDataSliced.filter((row) =>
      row.month.toLowerCase().includes(term)
    );
  }, [monthlyDataSliced, searchTerm]);

  // Sort by department column
  const sortedData = useMemo(() => {
    if (!sortBy || !sortDir) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [filteredData, sortBy, sortDir]);

  const handleDownload = () => {
    setDownloadLabel('\u2713 Baixado!');
    setTimeout(() => setDownloadLabel('Baixar'), 2000);
  };

  const handleColumnSort = (key: DeptKey) => {
    if (sortBy === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else if (sortDir === 'asc') { setSortBy(null); setSortDir(null); }
      else setSortDir('desc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sortIndicator = (key: DeptKey) => {
    if (sortBy !== key) return '';
    return sortDir === 'desc' ? ' \u25BC' : ' \u25B2';
  };

  const trendIcon = (trend: string) => {
    if (trend === 'up') return '\u2191';
    if (trend === 'down') return '\u2193';
    return '\u2192';
  };

  const trendClass = (trend: string) => {
    if (trend === 'up') return styles.trendUp;
    if (trend === 'down') return styles.trendDown;
    return styles.trendStable;
  };

  // Determine which columns to show based on department filter
  const selectedKey = selectedDept !== 'Todos' ? DEPT_LABEL_TO_KEY[selectedDept] : null;
  const visibleDeptKeys: DeptKey[] = selectedKey ? [selectedKey] : DEPT_KEYS.slice();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Historico de Competicoes</h1>
      <p className={styles.subtitle}>
        Evolucao dos departamentos ao longo do tempo
      </p>

      <div className={styles.toolbar}>
        <div className={styles.filterChips}>
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept}
              className={`${styles.chip} ${selectedDept === dept ? styles.chipActive : ''}`}
              onClick={() => setSelectedDept(dept)}
            >
              {selectedDept === dept && <span className={styles.chipDot} />}
              {dept}
            </button>
          ))}
        </div>
        <div className={styles.toolbarRight}>
          <select
            className={styles.periodSelect}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="3">3 meses</option>
            <option value="6">6 meses</option>
            <option value="12">12 meses</option>
          </select>
          <button className={styles.downloadBtn} onClick={handleDownload}>
            {downloadLabel}
          </button>
        </div>
      </div>

      {/* Search input */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>&#128269;</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por periodo (ex: Jan, Dez, Mar)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className={styles.searchClear}
            onClick={() => setSearchTerm('')}
            aria-label="Limpar busca"
          >
            &times;
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'pontos' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('pontos')}
        >
          Pontos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'ranking' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          Ranking
        </button>
      </div>

      {activeTab === 'pontos' ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Periodo</th>
                {visibleDeptKeys.map((key) => (
                  <th
                    key={key}
                    className={`${styles.sortableHeader} ${sortBy === key ? styles.sortedHeader : ''} ${selectedKey === key ? styles.highlightedHeader : ''}`}
                    onClick={() => handleColumnSort(key)}
                    title={`Ordenar por ${DEPT_KEY_TO_LABEL[key]}`}
                  >
                    {DEPT_KEY_TO_LABEL[key]}{sortIndicator(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={visibleDeptKeys.length + 1} className={styles.emptyRow}>
                    Nenhum resultado encontrado para &ldquo;{searchTerm}&rdquo;
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr
                    key={row.month}
                    className={`${styles.interactiveRow} ${hoveredRow === row.month ? styles.rowHovered : ''}`}
                    onMouseEnter={() => setHoveredRow(row.month)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className={styles.monthCell}>{row.month}</td>
                    {visibleDeptKeys.map((key) => (
                      <td
                        key={key}
                        className={`${selectedKey === key ? styles.highlightedCell : ''}`}
                      >
                        <span className={styles.pointsValue}>
                          {row[key].toLocaleString('pt-BR')}
                        </span>
                        {hoveredRow === row.month && (
                          <span className={styles.pointsLabel}> pts</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Ranking view as cards ── */
        <div className={styles.rankingGrid}>
          {rankingData.map((item) => {
            const isExpanded = expandedRankCard === item.dept;
            const badges = RANKING_BADGES[item.dept] ?? [];
            const isTop3 = item.rank <= 3;
            return (
              <div
                key={item.dept}
                className={`${styles.rankCard} ${isTop3 ? styles.rankCardTop : ''} ${isExpanded ? styles.rankCardExpanded : ''}`}
                onClick={() => setExpandedRankCard(isExpanded ? null : item.dept)}
              >
                <div className={styles.rankCardHeader}>
                  <span className={`${styles.rankPosition} ${item.rank === 1 ? styles.rankGold : item.rank === 2 ? styles.rankSilver : item.rank === 3 ? styles.rankBronze : ''}`}>
                    {item.rank}&#186;
                  </span>
                  <div className={styles.rankCardInfo}>
                    <span className={styles.rankDeptName}>{item.dept}</span>
                    <span className={styles.rankPoints}>
                      {item.points.toLocaleString('pt-BR')} pts
                    </span>
                  </div>
                  <span className={`${styles.rankTrend} ${trendClass(item.trend)}`}>
                    {trendIcon(item.trend)}
                    <span className={styles.rankTrendLabel}>
                      {item.trend === 'up' ? 'Subindo' : item.trend === 'down' ? 'Caindo' : 'Estavel'}
                    </span>
                  </span>
                </div>

                {isExpanded && (
                  <div className={styles.rankCardDetail}>
                    <p className={styles.rankDetailTitle}>Ultimas conquistas:</p>
                    <div className={styles.rankBadges}>
                      {badges.map((badge) => (
                        <span key={badge} className={styles.rankBadgeTag}>{badge}</span>
                      ))}
                    </div>
                    <button
                      className={styles.rankDetailLink}
                      onClick={(e) => { e.stopPropagation(); }}
                    >
                      Ver detalhes &rarr;
                    </button>
                  </div>
                )}

                {!isExpanded && (
                  <span className={styles.rankExpandHint}>Clique para ver detalhes</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
