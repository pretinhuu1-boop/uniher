import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CopsoqFlow from '@/components/copsoq/CopsoqFlow';
import { getNr1RuntimeEntitlementForCurrentRequest } from '@/lib/nr1/runtime-entitlement';

export const metadata: Metadata = {
  title: 'NR-1 / Yavix bloqueado · UniHER',
  description: 'Shell técnico restrito para mock controlado; sem laudo, scoring, GRO/PGR ou integração Yavix real.',
};

// Página demo (server component fino) — renderiza o fluxo COPSOQ41.
// NOTA: o card de campanha que leva a esta página entraria na home
//   /colaboradora (src/app/(platform)/colaboradora/page.tsx), no feed/missões.
//   Não editado aqui — apenas anotado (escopo: apenas arquivos novos).
export const dynamic = 'force-dynamic';

export default async function AvaliacaoNR1Page() {
  const entitlement = await getNr1RuntimeEntitlementForCurrentRequest();
  if (entitlement === 'missing_auth') redirect('/auth?redirect=%2Favaliacao-nr1');
  if (entitlement !== 'enabled') redirect('/nr1');

  return (
    <main style={{ minHeight: '100%', padding: '1.5rem 1rem' }}>
      <section
        aria-label="Aviso de gate NR-1"
        style={{
          maxWidth: 880,
          margin: '0 auto 1rem',
          padding: '0.85rem 1rem',
          border: '1px solid var(--rose-200)',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--rose-50)',
          color: 'var(--text-900)',
          fontFamily: 'var(--ff-body)',
          fontSize: '0.86rem',
          lineHeight: 1.5,
        }}
      >
        Preview técnico restrito: esta tela só pode operar com mock em ambiente dev/test e empresa
        explicitamente habilitada. Não gera laudo, scoring, conformidade NR-1, GRO/PGR nem integração
        real com a Yavix.
      </section>
      <CopsoqFlow locale="pt" />
    </main>
  );
}
