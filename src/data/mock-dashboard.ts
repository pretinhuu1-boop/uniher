import {
  Department,
  DashboardKPI,
  ROIProjection,
  CampaignStatus,
  EngagementDataPoint,
  AgeDistribution,
  HealthRisk,
  ConviteStatus,
  ReportConfig,
} from '@/types/platform';

export const DEPARTMENTS: Department[] = [
  { id: 'rh', name: 'RH', collaborators: 48, points: 30200, level: 1, badges: 3, engagementPercent: 92, examsPercent: 88, trend: 'up', color: '#3E7D5A' },
  { id: 'marketing', name: 'Marketing', collaborators: 124, points: 25500, level: 2, badges: 2, engagementPercent: 88, examsPercent: 75, trend: 'up', color: '#3E7D5A' },
  { id: 'ti', name: 'TI', collaborators: 156, points: 24500, level: 5, badges: 2, engagementPercent: 85, examsPercent: 70, trend: 'up', color: '#E8849E' },
  { id: 'financeiro', name: 'Financeiro', collaborators: 92, points: 20800, level: 4, badges: 2, engagementPercent: 78, examsPercent: 68, trend: 'up', color: '#A48090' },
  { id: 'comercial', name: 'Comercial', collaborators: 80, points: 19500, level: 5, badges: 2, engagementPercent: 74, examsPercent: 65, trend: 'stable', color: '#D4B060' },
  { id: 'operacoes', name: 'Operações', collaborators: 312, points: 17200, level: 6, badges: 0, engagementPercent: 65, examsPercent: 58, trend: 'down', color: '#D4B060' },
];

export const DASHBOARD_KPIS: DashboardKPI[] = [
  { label: 'Colaboradoras Ativas', value: 812, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 812 total', trendDirection: 'up', color: '#E8849E' },
  { label: 'Taxa de Engajamento', value: '92%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
  { label: 'Exames em Dia', value: '74%', subtitle: 'da população', icon: 'heart', trend: '↑ 0 colaboradoras', trendDirection: 'up', color: '#C85C7E' },
  { label: 'Atividades Completadas', value: 1247, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
];

export const ROI_DATA: ROIProjection = {
  roiMultiplier: 4.8,
  savings: 'R$ 287k',
  absenteeismReduction: '-23%',
};

export const CAMPAIGNS_DASHBOARD: CampaignStatus[] = [
  { name: 'Outubro Rosa', month: 'Outubro · Prevenção', progress: 87, status: 'done', statusLabel: 'Finalizada', color: '#C85C7E' },
  { name: 'Novembro Azul', month: 'Novembro · Saúde Masculina', progress: 72, status: 'done', statusLabel: 'Finalizada', color: '#378ADD' },
  { name: 'Dezembro Laranja', month: 'Dezembro · Diabetes', progress: 65, status: 'active', statusLabel: 'Ativa', color: '#EF9F27' },
  { name: 'Janeiro Branco', month: 'Janeiro · Saúde Mental', progress: 0, status: 'next', statusLabel: 'Próxima', color: '#A48090' },
];

export const ENGAGEMENT_OVER_TIME: EngagementDataPoint[] = [
  { month: 'Jul', engagement: 42, retention: 55 },
  { month: 'Ago', engagement: 58, retention: 62 },
  { month: 'Set', engagement: 72, retention: 70 },
  { month: 'Out', engagement: 78, retention: 75 },
  { month: 'Nov', engagement: 85, retention: 78 },
  { month: 'Dez', engagement: 92, retention: 82 },
];

export const AGE_DISTRIBUTION: AgeDistribution[] = [
  { label: '18-25', percent: 15, color: '#E8849E' },
  { label: '26-35', percent: 32, color: '#3E7D5A' },
  { label: '36-45', percent: 28, color: '#A48090' },
  { label: '46-55', percent: 18, color: '#D4B060' },
  { label: '56+', percent: 7, color: '#3E7D5A' },
];

export const HEALTH_RISK_EVOLUTION: HealthRisk[] = [
  { month: 'Jul', low: 50, medium: 30, high: 20 },
  { month: 'Ago', low: 55, medium: 28, high: 17 },
  { month: 'Set', low: 60, medium: 26, high: 14 },
  { month: 'Out', low: 65, medium: 23, high: 12 },
  { month: 'Nov', low: 70, medium: 20, high: 10 },
  { month: 'Dez', low: 75, medium: 17, high: 8 },
];

export const CONVITES: ConviteStatus = {
  total: 850,
  pending: 24,
  accepted: 812,
  expired: 14,
};

export const REPORTS: ReportConfig[] = [
  {
    type: 'weekly',
    label: 'Relatório Semanal',
    description: 'Resumo dos últimos 7 dias com métricas de engajamento',
    schedule: 'Toda segunda-feira às 9h',
    enabled: true,
    recipientEmail: 'paola@uniher.com.br',
  },
  {
    type: 'monthly',
    label: 'Relatório Mensal',
    description: 'Análise completa do mês com tendências e comparativos',
    schedule: 'Todo dia 1º às 9h',
    enabled: true,
    recipientEmail: 'paola@uniher.com.br',
  },
];

export const HIGHLIGHTS = {
  bestEngagement: { dept: 'RH', value: '92%' },
  bestExams: { dept: 'RH', value: '88%' },
  needsAttention: { dept: 'Operações', value: '65%' },
};

export const RANKING_PODIUM = [
  { position: 1, department: 'Operações', points: 37440, icon: '👑' },
  { position: 2, department: 'TI', points: 18720, icon: '🥈' },
  { position: 3, department: 'Marketing', points: 14880, icon: '🥉' },
];

export const CONQUISTAS_POR_DEPTO = [
  { department: 'TI', unlocked: 2, total: 9, level: 5 },
  { department: 'RH', unlocked: 1, total: 9, level: 5 },
  { department: 'Marketing', unlocked: 2, total: 9, level: 2 },
  { department: 'Financeiro', unlocked: 2, total: 9, level: 5 },
  { department: 'Comercial', unlocked: 2, total: 9, level: 5 },
  { department: 'Operações', unlocked: 2, total: 9, level: 3 },
];
