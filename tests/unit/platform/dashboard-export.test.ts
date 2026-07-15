import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildDashboardCsv,
  downloadDashboardCsv,
  formatDashboardDate,
  hasMeaningfulDashboardData,
  neutralizeCsvFormula,
} from '@/app/(platform)/dashboard/dashboard-export';
import type { DashboardViewModel } from '@/app/(platform)/dashboard/dashboard-view-model';

const model: DashboardViewModel = {
  summary: [
    {
      label: 'Participação ativa',
      value: '72%',
      detail: 'últimos 30 dias',
      state: 'positive',
    },
  ],
  actions: [],
  departments: [
    {
      id: 'd1',
      name: '=SUM(1,1)',
      engagementPercent: 61,
      trend: 'stable',
      color: '#536444',
    },
  ],
  campaigns: [
    {
      name: '+cmd\n"quoted"',
      month: 'Jul',
      progress: 82,
      status: 'active',
      statusLabel: 'Ativa',
      color: '#b98643',
    },
  ],
  roi: { roiMultiplier: 2, savings: 'R$ 20 mil', absenteeismReduction: '8%' },
  engagement: [],
  ageDistribution: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RH dashboard CSV export', () => {
  it.each(['=2+2', '+SUM(1,1)', '-10+20', '@SUM(1,1)', '\t=cmd', '\r=cmd'])(
    'neutralizes formula-leading cell %j',
    (value) => {
      expect(neutralizeCsvFormula(value)).toBe(`'${value}`);
    },
  );

  it('builds exact safe CSV while preserving commas, quotes, and newlines', () => {
    expect(buildDashboardCsv(model)).toBe([
      '"Resumo","Valor","Detalhe"',
      '"Participação ativa","72%","últimos 30 dias"',
      '',
      '"Departamentos","Engajamento","Tendência"',
      '"\'=SUM(1,1)","61%","stable"',
      '',
      '"Campanhas","Mês","Progresso","Status"',
      '"\'+cmd',
      '""quoted""","Jul","82%","Ativa"',
      '',
      '"Impacto estimado","Valor"',
      '"ROI","2x"',
      '"Economia anual","R$ 20 mil"',
      '"Redução de absenteísmo","8%"',
    ].join('\n'));
  });

  it('formats the filename date in the São Paulo calendar day', () => {
    const nearUtcMidnight = new Date('2026-07-16T02:30:00.000Z');

    expect(formatDashboardDate(nearUtcMidnight)).toBe('2026-07-15');
  });

  it('does not consider an all-zero dashboard meaningful for export', () => {
    const emptyModel: DashboardViewModel = {
      ...model,
      summary: model.summary.map((item) => ({ ...item, value: '0%' })),
      departments: [],
      campaigns: [],
      roi: { roiMultiplier: 0, savings: 'R$ 0', absenteeismReduction: '—' },
    };

    expect(hasMeaningfulDashboardData(emptyModel)).toBe(false);
    expect(hasMeaningfulDashboardData(model)).toBe(true);
  });

  it('considers a non-zero summary meaningful without detailed series', () => {
    const summaryOnlyModel: DashboardViewModel = {
      ...model,
      departments: [],
      campaigns: [],
      roi: { roiMultiplier: 0, savings: 'R$ 0', absenteeismReduction: '0%' },
    };

    expect(hasMeaningfulDashboardData(summaryOnlyModel)).toBe(true);
  });

  it('defers object URL cleanup until after starting the download', () => {
    let cleanup: (() => void) | undefined;
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    const createObjectURL = vi.fn(() => 'blob:dashboard');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('window', {
      setTimeout: vi.fn((callback: () => void) => {
        cleanup = callback;
        return 1;
      }),
    });

    downloadDashboardCsv(model, new Date('2026-07-16T02:30:00.000Z'));

    expect(link.click).toHaveBeenCalledOnce();
    expect(link.download).toBe('uniher-dashboard-2026-07-15.csv');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    cleanup?.();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:dashboard');
  });
});
