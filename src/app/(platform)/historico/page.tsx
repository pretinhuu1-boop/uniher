'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import styles from './historico.module.css';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface HistoryData {
  period: number;
  departments: string[];
  monthlyData: Record<string, any>[];
  ranking: { rank: number; department: string; points: number; badgeCount: number }[];
}

type ViewTab = 'pontos' | 'ranking';
type SortDir = 'asc' | 'desc' | null;

export default function HistoricoPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('pontos');
  const [selectedDept, setSelectedDept] = useState('Todos');
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [downloadLabel, setDownloadLabel] = useState('Baixar');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [expandedRankCard, setExpandedRankCard] = useState<string | null>(null);

  const deptParam = selectedDept !== 'Todos' ? `&department=${encodeURIComponent(selectedDept)}` : '';
  const { data, isLoading } = useSWR<HistoryData>(
    `/api/analytics/history?period=${selectedPeriod}${deptParam}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const departments = data?.departments ?? [];
  const monthlyDataRaw = data?.monthlyData ?? [];
  const rankingData = data?.ranking ?? [];

  // Build department filter list from API data
  const DEPARTMENTS = useMemo(() => ['Todos', ...departments], [departments]);
  const visibleDepts = selectedDept !== 'Todos' ? [selectedDept] : departments;

  // Filter by search term (month name)
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return monthlyDataRaw;
    const term = searchTerm.toLowerCase();
    return monthlyDataRaw.filter((row) =>
      (row.month as string).toLowerCase().includes(term)
    );
  }, [monthlyDataRaw, searchTerm]);

  // Sort by department column
  const sortedData = useMemo(() => {
    if (!sortBy || !sortDir) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = (a[sortBy] as number) || 0;
      const bVal = (b[sortBy] as number) || 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return sorted;
  }, [filteredData, sortBy, sortDir]);

  const handleDownload = () => {
    if (!data || monthlyDataRaw.length === 0) return;
    const headers = ['Periodo', ...visibleDepts];
    const rows = monthlyDataRaw.map(row =>
      [row.month, ...visibleDepts.map(d => row[d] ?? 0)].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico.csv';
    a.click();
    URL.revokeObjectURL(url);
    setDownloadLabel('\u2713 Baixado!');
    setTimeout(() => setDownloadLabel('Baixar'), 2000);
  };

  const handleColumnSort = (key: string) => {
    if (sortBy === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else if (sortDir === 'asc') { setSortBy(null); setSortDir(null); }
      else setSortDir('desc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  const sortIndicator = (key: string) => {
    if (sortBy !== key) return '';
    return sortDir === 'desc' ? ' \u25BC' : ' \u25B2';
  };

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

      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-400)' }}>
          <p>Carregando dados...</p>
        </div>
      )}

      {!isLoading && activeTab === 'pontos' ? (
        <div className={styles.tableWrap}>
          {sortedData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
              <p style={{ fontWeight: 600, color: '#1a2a4a', fontSize: 16 }}>Sem dados no período</p>
              <p style={{ color: '#8a7a6a', fontSize: 13, marginTop: 4 }}>
                {searchTerm ? `Nenhum resultado para "${searchTerm}". Tente outro termo ou limpe a busca.` : 'Os dados de pontuação aparecerão aqui conforme as competições forem registradas.'}
              </p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Periodo</th>
                  {visibleDepts.map((dept) => (
                    <th
                      key={dept}
                      className={`${styles.sortableHeader} ${sortBy === dept ? styles.sortedHeader : ''} ${selectedDept === dept ? styles.highlightedHeader : ''}`}
                      onClick={() => handleColumnSort(dept)}
                      title={`Ordenar por ${dept}`}
                    >
                      {dept}{sortIndicator(dept)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row) => (
                  <tr
                    key={row.month}
                    className={`${styles.interactiveRow} ${hoveredRow === row.month ? styles.rowHovered : ''}`}
                    onMouseEnter={() => setHoveredRow(row.month as string)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td className={styles.monthCell}>{row.month}</td>
                    {visibleDepts.map((dept) => (
                      <td
                        key={dept}
                        className={`${selectedDept === dept ? styles.highlightedCell : ''}`}
                      >
                        <span className={styles.pointsValue}>
                          {((row[dept] as number) || 0).toLocaleString('pt-BR')}
                        </span>
                        {hoveredRow === row.month && (
                          <span className={styles.pointsLabel}> pts</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : !isLoading ? (
        /* Ranking view as cards */
        <div className={styles.rankingGrid}>
          {rankingData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <p style={{ fontWeight: 600, color: '#1a2a4a', fontSize: 16 }}>Ranking ainda sem dados</p>
              <p style={{ color: '#8a7a6a', fontSize: 13, marginTop: 4 }}>O ranking será preenchido conforme os departamentos acumularem pontos em desafios e campanhas.</p>
            </div>
          ) : (
            rankingData.map((item) => {
              const isExpanded = expandedRankCard === item.department;
              const isTop3 = item.rank <= 3;
              return (
                <div
                  key={item.department}
                  className={`${styles.rankCard} ${isTop3 ? styles.rankCardTop : ''} ${isExpanded ? styles.rankCardExpanded : ''}`}
                  onClick={() => setExpandedRankCard(isExpanded ? null : item.department)}
                >
                  <div className={styles.rankCardHeader}>
                    <span className={`${styles.rankPosition} ${item.rank === 1 ? styles.rankGold : item.rank === 2 ? styles.rankSilver : item.rank === 3 ? styles.rankBronze : ''}`}>
                      {item.rank}&#186;
                    </span>
                    <div className={styles.rankCardInfo}>
                      <span className={styles.rankDeptName}>{item.department}</span>
                      <span className={styles.rankPoints}>
                        {item.points.toLocaleString('pt-BR')} pts
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={styles.rankCardDetail}>
                      <p className={styles.rankDetailTitle}>Badges conquistados: {item.badgeCount}</p>
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
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
