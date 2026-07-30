import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CopsoqFlow from '@/components/copsoq/CopsoqFlow';
import { getNr1RuntimeEntitlementForCurrentRequest } from '@/lib/nr1/runtime-entitlement';
import { isYavixMock } from '@/lib/yavix/config';

export const metadata: Metadata = {
  title: 'Avaliacao NR-1 - UniHER',
  description: 'Avaliacao NR-1 disponivel conforme liberacao autorizada.',
};

export const dynamic = 'force-dynamic';

export default async function AvaliacaoNR1Page() {
  const entitlement = await getNr1RuntimeEntitlementForCurrentRequest();
  if (entitlement === 'missing_auth') redirect('/auth?redirect=%2Favaliacao-nr1');
  if (entitlement !== 'enabled') redirect('/nr1');
  if (!isYavixMock()) redirect('/nr1');

  return (
    <main style={{ minHeight: '100%', padding: '1.5rem 1rem' }}>
      <CopsoqFlow locale="pt" />
    </main>
  );
}
