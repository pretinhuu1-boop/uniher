const shimmer = `
  @keyframes shimmer {
    0%   { opacity: 1; }
    50%  { opacity: 0.45; }
    100% { opacity: 1; }
  }
  .skel { animation: shimmer 1.6s ease-in-out infinite; }
`;

const S = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    padding: '32px',
    maxWidth: '1280px',
    width: '100%',
  },
  block: (w: string, h: string, radius = '8px') => ({
    width: w,
    height: h,
    borderRadius: radius,
    background: '#e8e0d8',
  }),
  row: (gap = '16px') => ({
    display: 'flex',
    gap,
    alignItems: 'center' as const,
  }),
  grid: (cols: string, gap = '16px') => ({
    display: 'grid',
    gridTemplateColumns: cols,
    gap,
  }),
  card: {
    background: '#fff',
    border: '1px solid #e8e0d8',
    borderRadius: '12px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
};

export default function PlatformLoading() {
  return (
    <>
      <style>{shimmer}</style>
      <div style={S.page} className="skel" aria-busy="true" aria-label="Carregando…">
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={S.block('80px', '20px', '20px')} />
          <div style={S.block('260px', '36px', '6px')} />
          <div style={S.block('380px', '16px', '4px')} />
        </div>

        {/* KPI row */}
        <div style={S.grid('repeat(3, 1fr)')}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={S.card}>
              <div style={S.row('10px')}>
                <div style={S.block('32px', '32px', '8px')} />
                <div style={S.block('120px', '14px', '4px')} />
              </div>
              <div style={S.block('80px', '32px', '4px')} />
              <div style={S.block('100%', '8px', '4px')} />
            </div>
          ))}
        </div>

        {/* Content cards */}
        <div style={S.grid('1fr 1fr', '20px')}>
          {[0, 1].map((i) => (
            <div key={i} style={S.card}>
              <div style={S.row('12px')}>
                <div style={S.block('140px', '20px', '4px')} />
              </div>
              <div style={S.block('100%', '200px', '8px')} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
