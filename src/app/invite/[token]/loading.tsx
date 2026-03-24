const spin = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e8e0d8;
    border-top-color: #C9A264;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
`;

export default function InviteLoading() {
  return (
    <>
      <style>{spin}</style>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f5f0eb',
          gap: '20px',
        }}
        aria-busy="true"
        aria-label="Verificando convite…"
      >
        <span style={{ fontSize: '2.4rem', lineHeight: 1 }}>🌸</span>
        <div className="spinner" />
        <p
          style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#6b6b6b',
            margin: 0,
            letterSpacing: '0.01em',
          }}
        >
          Verificando convite...
        </p>
      </div>
    </>
  );
}
