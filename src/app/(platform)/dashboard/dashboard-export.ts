import type { DashboardViewModel } from './dashboard-view-model';

const DASHBOARD_TIME_ZONE = 'America/Sao_Paulo';

export function neutralizeCsvFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const safeValue = neutralizeCsvFormula(String(value));
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function buildDashboardCsv(model: DashboardViewModel): string {
  const rows: Array<Array<string | number>> = [
    ['Resumo', 'Valor', 'Detalhe'],
    ...model.summary.map((item) => [item.label, item.value, item.detail]),
    [],
    ['Departamentos', 'Engajamento', 'Tendência'],
    ...model.departments.map((department) => [
      department.name,
      `${department.engagementPercent}%`,
      department.trend,
    ]),
    [],
    ['Campanhas', 'Mês', 'Progresso', 'Status'],
    ...model.campaigns.map((campaign) => [
      campaign.name,
      campaign.month,
      `${campaign.progress}%`,
      campaign.statusLabel,
    ]),
    [],
    ['Impacto estimado', 'Valor'],
    ['ROI', `${model.roi.roiMultiplier}x`],
    ['Economia anual', model.roi.savings],
    ['Redução de absenteísmo', model.roi.absenteeismReduction],
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function formatDashboardDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DASHBOARD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

function hasNonZeroValue(value: string | number): boolean {
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;

  const digits = value.replace(/[^\d]/g, '');
  return digits !== '' && Number(digits) > 0;
}

export function hasMeaningfulDashboardData(model: DashboardViewModel): boolean {
  const absenteeism = model.roi.absenteeismReduction.trim();
  const hasAbsenteeismImpact = absenteeism !== '' && absenteeism !== '—' && absenteeism !== '0%';

  return model.summary.some((item) => hasNonZeroValue(item.value))
    || model.departments.length > 0
    || model.campaigns.length > 0
    || model.engagement.length > 0
    || model.ageDistribution.length > 0
    || model.roi.roiMultiplier > 0
    || hasNonZeroValue(model.roi.savings)
    || hasAbsenteeismImpact;
}

export function downloadDashboardCsv(model: DashboardViewModel, date = new Date()) {
  const csv = buildDashboardCsv(model);
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `uniher-dashboard-${formatDashboardDate(date)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
