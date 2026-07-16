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
    { label: 'Engajamento', metric: notComputable, detail: 'indispon\u00edvel', state: 'neutral' },
    { label: 'Participa\u00e7\u00e3o em campanha', metric: notComputable, detail: 'indispon\u00edvel', state: 'neutral' },
  ],
  actions: [],
  metrics: {
    examActivity: suppressed,
    engagement: notComputable,
    healthRisk: notComputable,
    campaignParticipation: notComputable,
    roi: notComputable,
  },
  departments: [
    { id: 'd1', name: '=SUM(1,1)', color: '#536444', metric: suppressed },
  ],
  ageDistribution: [
    { label: '26-35', color: '#536444', metric: { status: 'visible', value: 12 } },
  ],
  examActivitySeries: [
    { period: '2026-07', metric: suppressed },
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
    expect(csv).not.toMatch(/86421|rawValue|contributorCount|numerator|denominator/);
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
