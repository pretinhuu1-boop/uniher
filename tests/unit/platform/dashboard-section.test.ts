import { describe, expect, it } from 'vitest';

import { getDashboardSectionContext } from '@/app/(platform)/dashboard/dashboard-section';

describe('dashboard section compatibility routes', () => {
  it('labels Saúde Primária as a protected dashboard compatibility route', () => {
    expect(getDashboardSectionContext('saude-primaria')).toEqual({
      key: 'saude-primaria',
      headerContext: 'Dashboard RH · Saúde Primária',
      description:
        'Rota de compatibilidade para Saúde Primária: mantém a visão consolidada do dashboard RH e expõe apenas indicadores agregados protegidos.',
    });
  });

  it('labels exames without promising a dedicated exam history screen', () => {
    const context = getDashboardSectionContext('exames');

    expect(context?.headerContext).toBe('Dashboard RH · Exames');
    expect(context?.description).toContain('visão consolidada do dashboard RH');
    expect(context?.description).toContain('sem histórico individual ou tela dedicada de exames');
  });

  it('ignores unknown section params so the base dashboard stays generic', () => {
    expect(getDashboardSectionContext(null)).toBeNull();
    expect(getDashboardSectionContext('financeiro')).toBeNull();
  });
});
