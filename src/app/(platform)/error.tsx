'use client';

import Link from 'next/link';

export default function PlatformError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '40px 24px',
        textAlign: 'center',
        gap: '20px',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(200, 92, 126, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem',
        }}
      >
        ⚠️
      </div>

      {/* Title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2
          style={{
            fontFamily: 'var(--ff-display)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--text-900, #2d2d2d)',
            margin: 0,
          }}
        >
          Algo deu errado
        </h2>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--text-600, #6b6b6b)',
            margin: 0,
            maxWidth: '420px',
            lineHeight: 1.5,
          }}
        >
          {error?.message || 'Ocorreu um erro inesperado. Tente novamente ou volte ao dashboard.'}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          style={{
            padding: '10px 24px',
            fontSize: '0.88rem',
            fontWeight: 600,
            border: 'none',
            borderRadius: '8px',
            background: 'var(--rose-500, #C9A264)',
            color: '#fff',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--rose-700, #a03c5a)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--rose-500, #C9A264)')}
        >
          Tentar novamente
        </button>

        <Link
          href="/dashboard"
          style={{
            padding: '10px 24px',
            fontSize: '0.88rem',
            fontWeight: 600,
            border: '1.5px solid var(--rose-400, #E8849E)',
            borderRadius: '8px',
            color: 'var(--rose-500, #C9A264)',
            textDecoration: 'none',
            transition: 'background 0.15s',
            display: 'inline-flex',
            alignItems: 'center',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(200,92,126,0.06)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
