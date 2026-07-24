import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CopsoqFlow from '@/components/copsoq/CopsoqFlow';
import { getNr1RuntimeEntitlementForCurrentRequest } from '@/lib/nr1/runtime-entitlement';

export const metadata: Metadata = {
  title: 'Avaliação Psicossocial (NR-1) · UniHER',
  description: 'Questionário COPSOQ41 — avaliação de fatores de risco psicossocial no trabalho.',
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
      <CopsoqFlow locale="pt" />
    </main>
  );
}
