const shimmer = `
  @keyframes shimmer {
    0%   { opacity: 1; }
    50%  { opacity: 0.45; }
    100% { opacity: 1; }
  }
  .skel { animation: shimmer 1.6s ease-in-out infinite; }
`;

const block = (w: string, h: string, radius = '8px') => ({
  width: w,
  height: h,
  borderRadius: radius,
  background: '#e8e0d8',
  flexShrink: 0 as const,
});

const kpiCard = {
  background: '#fff',
  border: '1px solid #e8e0d8',
  borderRadius: '12px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
};

export default function DashboardLoading() {
  return (
    <>
      <style>{shimmer}</style>
      <div
        className="skel"
        aria-busy="true"
        aria-label="Carregando dashboard…"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '32px',
          maxWidth: '1280px',
          width: '100%',
        }}
      >
        {/* Page header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={block('72px', '18px', '20px')} />
          <div style={block('240px', '34px', '6px')} />
          <div style={block('340px', '14px', '4px')} />
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {[120, 100, 110].map((w, i) => (
            <div key={i} style={block(`${w}px`, '34px', '8px')} />
          ))}
        </div>

        {/* KPI row 1 — 3 cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={kpiCard}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={block('28px', '28px', '6px')} />
                <div style={block('110px', '13px', '4px')} />
              </div>
              <div style={block('90px', '36px', '4px')} />
              <div style={block('60px', '12px', '4px')} />
              <div style={block('100%', '7px', '4px')} />
            </div>
          ))}
        </div>

        {/* KPI row 2 — 3 cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '16px',
          }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={kpiCard}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={block('28px', '28px', '6px')} />
                <div style={block('110px', '13px', '4px')} />
              </div>
              <div style={block('90px', '36px', '4px')} />
              <div style={block('60px', '12px', '4px')} />
              <div style={block('100%', '7px', '4px')} />
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid #e8e0d8',
                borderRadius: '12px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={block('160px', '20px', '4px')} />
              <div style={block('100%', '200px', '8px')} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
