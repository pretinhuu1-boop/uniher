import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildDashboardCsv,
  downloadDashboardCsv,
  formatDashboardDate,
  hasMeaningfulDashboardData,
  neutralizeCsvFormula,
} from '@/app/(platform)/dashboard/dashboard-export';
import type { DashboardViewModel } from '@/app/(platform)/dashboard/dashboard-view-model';
import { SUPPRESSION_MESSAGE } from '@/types/privacy';

const suppressed = { status: 'suppressed', reason: 'minimum_cohort', message: SUPPRESSION_MESSAGE } as const;
const notComputable = { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE } as const;

const model: DashboardViewModel = {
  summary: [
    { label: 'Atividade de exames', metric: suppressed, detail: 'per\u00edodo', state: 'neutral' },
    { label: 'Check-in', metric: { status: 'visible', value: 10 }, detail: 'per\u00edodo', state: 'neutral' },
    { label: 'Check-out', metric: suppressed, detail: 'per\u00edodo', state: 'neutral' },
    { label: 'Engajamento', metric: notComputable, detail: 'indispon\u00edvel', state: 'neutral' },
    { label: 'Participa\u00e7\u00e3o em campanha', metric: notComputable, detail: 'indispon\u00edvel', state: 'neutral' },
  ],
  actions: [
    {
      label: 'Campanhas',
      description: 'CANARY_ACTION_DESCRIPTION_NOT_CSV 86421',
      href: '/campanhas',
    },
  ],
  metrics: {
    examActivity: suppressed,
    wellbeingCheckIn: { status: 'visible', value: 10 },
    wellbeingCheckOut: suppressed,
    engagement: notComputable,
    healthRisk: notComputable,
    campaignParticipation: notComputable,
    roi: notComputable,
  },
  departments: [
    { id: 'CANARY_DEPARTMENT_ID_NOT_CSV', name: '=SUM(1,1)', color: 'CANARY_DEPARTMENT_COLOR_NOT_CSV', metric: suppressed },
  ],
  ageDistribution: [
    { label: '26-35', color: 'CANARY_AGE_COLOR_NOT_CSV', metric: { status: 'visible', value: 12 } },
  ],
  examActivitySeries: [
    { period: '2026-07', metric: suppressed },
  ],
  wellbeingSeries: [
    { period: '2026-07', checkIn: { status: 'visible', value: 10 }, checkOut: suppressed },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RH protected dashboard CSV export', () => {
  it.each(['=2+2', '+SUM(1,1)', '-10+20', '@SUM(1,1)', '\t=cmd', '\r=cmd'])(
    'neutralizes formula-leading cell %j',
    (value) => {
      expect(neutralizeCsvFormula(value)).toBe(`'${value}`);
    },
  );

  it('serializes the protected union and never substitutes a suppressed value', () => {
    const csv = buildDashboardCsv(model);

    expect(csv).toContain(SUPPRESSION_MESSAGE);
    expect(csv).toContain('"\'=SUM(1,1)"');
    expect(csv).toContain('"26-35",12');
    expect(csv).toContain('"Check-in x Check-out por mês","Check-in","Check-out"');
    expect(csv).toContain('"2026-07",10,Dados insuficientes para proteger a privacidade');
    expect(csv).not.toMatch(/86421|rawValue|contributorCount|numerator|denominator/);
    expect(csv).not.toMatch(/CANARY_(?:ACTION|DEPARTMENT|AGE)/);
  });

  it('formats the filename date in the S\u00e3o Paulo calendar day', () => {
    const nearUtcMidnight = new Date('2026-07-16T02:30:00.000Z');
    expect(formatDashboardDate(nearUtcMidnight)).toBe('2026-07-15');
  });

  it('keeps export enabled when every sensitive cell is suppressed', () => {
    expect(hasMeaningfulDashboardData(model)).toBe(true);
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
