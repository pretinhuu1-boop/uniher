'use client'

import Link from 'next/link'

export default function CampanhasError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem', textAlign: 'center', background: '#FAF7F2' }}>
      <h2 style={{ color: '#1A3A6B', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Erro nas Campanhas</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem', maxWidth: 400 }}>
        Algo deu errado ao carregar as campanhas. Tente novamente ou volte mais tarde.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={reset}
          style={{ padding: '0.6rem 1.5rem', background: '#C9A264', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          Tentar novamente
        </button>
        <Link href="/dashboard" style={{ padding: '0.6rem 1.5rem', border: '2px solid #1A3A6B', color: '#1A3A6B', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  )
}
