export type DashboardSectionKey = 'saude-primaria' | 'exames';

export interface DashboardSectionContext {
  readonly key: DashboardSectionKey;
  readonly headerContext: string;
  readonly description: string;
}

const DASHBOARD_SECTION_CONTEXTS: Readonly<Record<DashboardSectionKey, DashboardSectionContext>> = {
  'saude-primaria': {
    key: 'saude-primaria',
    headerContext: 'Dashboard RH · Saúde Primária',
    description:
      'Rota de compatibilidade para Saúde Primária: mantém a visão consolidada do dashboard RH e expõe apenas indicadores agregados protegidos.',
  },
  exames: {
    key: 'exames',
    headerContext: 'Dashboard RH · Exames',
    description:
      'Rota de compatibilidade para exames: mantém a visão consolidada do dashboard RH, sem histórico individual ou tela dedicada de exames.',
  },
};

export function getDashboardSectionContext(section: string | null): DashboardSectionContext | null {
  if (section === 'saude-primaria' || section === 'exames') {
    return DASHBOARD_SECTION_CONTEXTS[section];
  }

  return null;
}
