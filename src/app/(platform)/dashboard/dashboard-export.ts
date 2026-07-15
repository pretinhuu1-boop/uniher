import type { DashboardViewModel } from './dashboard-view-model';

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function downloadDashboardCsv(model: DashboardViewModel) {
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
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `uniher-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
