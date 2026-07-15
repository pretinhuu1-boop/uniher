import { describe, expect, it } from 'vitest';
import { createDashboardViewModel } from '@/app/(platform)/dashboard/dashboard-view-model';
import type {
  AgeDistribution,
  CampaignStatus,
  DashboardKPI,
  Department,
  EngagementDataPoint,
  ROIProjection,
} from '@/types/platform';

const engagement: EngagementDataPoint[] = [
  { month: 'Jun', engagement: 68, retention: 61 },
  { month: 'Jul', engagement: 72, retention: 66 },
];

const ageDistribution: AgeDistribution[] = [
  { label: '26-35', percent: 100, color: '#536444' },
];

const roi: ROIProjection = {
  roiMultiplier: 2,
  savings: 'R$ 20 mil',
  absenteeismReduction: '8%',
};

const departments: Department[] = [
  {
    id: 'd1',
    name: 'Operações',
    collaborators: 20,
    points: 0,
    level: 1,
    badges: 0,
    engagementPercent: 61,
    examsPercent: 0,
    trend: 'stable',
    color: '#536444',
  },
  {
    id: 'd2',
    name: 'Produto',
    collaborators: 12,
    points: 0,
    level: 1,
    badges: 0,
    engagementPercent: 70,
    examsPercent: 0,
    trend: 'up',
    color: '#b98643',
  },
];

const campaigns: CampaignStatus[] = [
  {
    name: 'Julho',
    month: 'Jul',
    progress: 82,
    status: 'active',
    statusLabel: 'Ativa',
    color: '#b98643',
  },
  {
    name: 'Junho',
    month: 'Jun',
    progress: 100,
    status: 'done',
    statusLabel: 'Concluída',
    color: '#536444',
  },
];

describe('RH dashboard view model', () => {
  it('maps the exact summary and action destinations from aggregate source data', () => {
    const kpis: DashboardKPI[] = [
      { label: 'Colaboradoras Ativas', value: 84, icon: 'users' },
      { label: 'Engajamento', value: '72%', icon: 'activity' },
    ];

    const model = createDashboardViewModel({
      kpis,
      departments,
      campaigns,
      roi,
      engagement,
      ageDistribution,
    });

    expect(model.summary).toEqual([
      expect.objectContaining({ label: 'Participação ativa', value: '72%' }),
      expect.objectContaining({ label: 'Ações em andamento', value: 1 }),
      expect.objectContaining({ label: 'Pontos de atenção', value: 1 }),
    ]);
    expect(model.actions.map(({ label, href }) => ({ label, href }))).toEqual([
      { label: 'Campanhas', href: '/campanhas' },
      { label: 'Convites', href: '/convites' },
      { label: 'Histórico', href: '/historico' },
    ]);
  });

  it('exposes only aggregate department and campaign fields', () => {
    const model = createDashboardViewModel({
      kpis: [],
      departments,
      campaigns,
      roi,
      engagement,
      ageDistribution,
    });

    expect(model.departments).toEqual([
      {
        id: 'd1',
        name: 'Operações',
        engagementPercent: 61,
        trend: 'stable',
        color: '#536444',
      },
      {
        id: 'd2',
        name: 'Produto',
        engagementPercent: 70,
        trend: 'up',
        color: '#b98643',
      },
    ]);
    expect(model.campaigns).toEqual(campaigns);
    expect(JSON.stringify(model)).not.toMatch(/diagnóstico|paciente|individual|collaborators|examsPercent/i);
  });

  it('passes ROI and chart aggregates through unchanged', () => {
    const model = createDashboardViewModel({
      kpis: [],
      departments: [],
      campaigns: [],
      roi,
      engagement,
      ageDistribution,
    });

    expect(model.roi).toBe(roi);
    expect(model.engagement).toBe(engagement);
    expect(model.ageDistribution).toBe(ageDistribution);
  });

  it('falls back to zero participation and excludes the 70 percent boundary from attention', () => {
    const model = createDashboardViewModel({
      kpis: [{ label: 'Colaboradoras Ativas', value: 0, icon: 'users' }],
      departments: [departments[1]],
      campaigns: [campaigns[1]],
      roi,
      engagement: [],
      ageDistribution: [],
    });

    expect(model.summary.map(({ value }) => value)).toEqual(['0%', 0, 0]);
  });
});
