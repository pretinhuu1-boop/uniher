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

export default function ColaboradoraLoading() {
  return (
    <>
      <style>{shimmer}</style>
      <div
        className="skel"
        aria-busy="true"
        aria-label="Carregando painel…"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '32px',
          maxWidth: '900px',
          width: '100%',
        }}
      >
        {/* Header panel */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e8e0d8',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Avatar */}
          <div style={block('72px', '72px', '50%')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div style={block('180px', '24px', '6px')} />
            <div style={block('130px', '14px', '4px')} />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <div style={block('80px', '22px', '20px')} />
              <div style={block('80px', '22px', '20px')} />
            </div>
          </div>
          {/* Score */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <div style={block('60px', '40px', '6px')} />
            <div style={block('80px', '12px', '4px')} />
          </div>
        </div>

        {/* Two cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
          }}
        >
          {[0, 1].map((i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                border: '1px solid #e8e0d8',
                borderRadius: '12px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={block('32px', '32px', '8px')} />
                <div style={block('120px', '16px', '4px')} />
              </div>
              <div style={block('70px', '32px', '4px')} />
              <div style={block('90px', '12px', '4px')} />
            </div>
          ))}
        </div>

        {/* Progress bars card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #e8e0d8',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={block('160px', '20px', '4px')} />

          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={block('140px', '13px', '4px')} />
                <div style={block('40px', '13px', '4px')} />
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  background: '#e8e0d8',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${45 + i * 18}%`,
                    height: '100%',
                    borderRadius: '4px',
                    background: '#d4c8be',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
