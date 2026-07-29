import { describe, expect, it } from 'vitest';

import { createDashboardViewModel } from '@/app/(platform)/dashboard/dashboard-view-model';
import type { ProtectedDashboardProjection } from '@/types/platform';
import { SUPPRESSION_MESSAGE } from '@/types/privacy';

const projection: ProtectedDashboardProjection = {
  filters: { period: '1m' },
  metrics: {
    examActivity: { status: 'visible', value: 12 },
    wellbeingCheckIn: { status: 'visible', value: 11 },
    wellbeingCheckOut: { status: 'visible', value: 10 },
    engagement: { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
    healthRisk: { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
    campaignParticipation: { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
    roi: { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
  },
  departments: [
    { id: 'd1', name: 'Opera\u00e7\u00f5es', color: '#536444', metric: { status: 'visible', value: 12 } },
  ],
  ageDistribution: [
    { label: '26-35', color: '#536444', metric: { status: 'visible', value: 12 } },
  ],
  examActivitySeries: [
    { period: '2026-07', metric: { status: 'visible', value: 12 } },
  ],
  wellbeingSeries: [
    {
      period: '2026-07',
      checkIn: { status: 'visible', value: 11 },
      checkOut: { status: 'visible', value: 10 },
    },
  ],
};

describe('RH protected dashboard view model', () => {
  it('maps explicit protected summary metrics without converting suppression to zero', () => {
    const model = createDashboardViewModel(projection);

    expect(model.summary.map(({ label, metric }) => ({ label, metric }))).toEqual([
      { label: 'Atividade de exames', metric: { status: 'visible', value: 12 } },
      { label: 'Check-in', metric: { status: 'visible', value: 11 } },
      { label: 'Check-out', metric: { status: 'visible', value: 10 } },
      {
        label: 'Engajamento',
        metric: { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
      },
      {
        label: 'Participação em campanha',
        metric: { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
      },
    ]);
  });

  it('exposes only protected department, age and exam-series fields', () => {
    const model = createDashboardViewModel(projection);

    expect(model.departments).toEqual(projection.departments);
    expect(model.ageDistribution).toEqual(projection.ageDistribution);
    expect(model.examActivitySeries).toEqual(projection.examActivitySeries);
    expect(model.wellbeingSeries).toEqual(projection.wellbeingSeries);
    expect(model.metrics.healthRisk).toEqual(
      { status: 'suppressed', reason: 'not_computable', message: SUPPRESSION_MESSAGE },
    );
    expect(JSON.stringify(model)).not.toMatch(/points|ranking|badges|streak|roiMultiplier|progress/i);
  });

  it('preserves a minimum-cohort suppression marker exactly', () => {
    const suppressed: ProtectedDashboardProjection = {
      ...projection,
      metrics: {
        ...projection.metrics,
        examActivity: { status: 'suppressed', reason: 'minimum_cohort', message: SUPPRESSION_MESSAGE },
      },
    };

    expect(createDashboardViewModel(suppressed).summary[0].metric).toEqual(
      { status: 'suppressed', reason: 'minimum_cohort', message: SUPPRESSION_MESSAGE },
    );
  });

  it('returns fresh readonly actions for each view model', () => {
    const first = createDashboardViewModel(projection);
    const second = createDashboardViewModel(projection);

    expect(first.actions).not.toBe(second.actions);
    expect(first.actions[0]).not.toBe(second.actions[0]);
    expect(Object.isFrozen(first.actions)).toBe(true);
    expect(Object.isFrozen(first.actions[0])).toBe(true);
  });
});
