import { serializeProtectedMetricForCsv } from '@/lib/privacy/aggregate-suppression';
import type { ProtectedMetric } from '@/types/privacy';
import type { DashboardViewModel } from './dashboard-view-model';

const DASHBOARD_TIME_ZONE = 'America/Sao_Paulo';

function assertNever(value: never): never {
  throw new Error(`Estado de métrica protegida não suportado: ${JSON.stringify(value)}`);
}

export function neutralizeCsvFormula(value: string): string {
  return /^[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const safeValue = neutralizeCsvFormula(String(value));
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function protectedCsvCell(metric: ProtectedMetric<unknown>): string {
  switch (metric.status) {
    case 'visible':
    case 'suppressed':
      return serializeProtectedMetricForCsv(metric);
    default:
      return assertNever(metric);
  }
}

export function buildDashboardCsv(model: DashboardViewModel): string {
  const rows: string[] = [
    [csvCell('Resumo protegido'), csvCell('Valor'), csvCell('Detalhe')].join(','),
    ...model.summary.map((item) => [
      csvCell(item.label),
      protectedCsvCell(item.metric),
      csvCell(item.detail),
    ].join(',')),
    '',
    [csvCell('Departamentos'), csvCell('Contribuintes ativos protegidos')].join(','),
    ...model.departments.map((department) => [
      csvCell(department.name),
      protectedCsvCell(department.metric),
    ].join(',')),
    '',
    [csvCell('Faixas etárias'), csvCell('Contribuintes ativos protegidos')].join(','),
    ...model.ageDistribution.map((bucket) => [
      csvCell(bucket.label),
      protectedCsvCell(bucket.metric),
    ].join(',')),
    '',
    [csvCell('Atividade de exames por mês'), csvCell('Contribuintes distintos')].join(','),
    ...model.examActivitySeries.map((point) => [
      csvCell(point.period),
      protectedCsvCell(point.metric),
    ].join(',')),
    '',
    [csvCell('ROI e absenteísmo'), protectedCsvCell(model.metrics.roi)].join(','),
    [csvCell('Risco de saúde'), protectedCsvCell(model.metrics.healthRisk)].join(','),
  ];

  return rows.join('\n');
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

export function hasMeaningfulDashboardData(_model: DashboardViewModel): boolean {
  return true;
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
