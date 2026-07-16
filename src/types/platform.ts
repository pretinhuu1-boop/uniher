/* ═══════════════════════════════════════════════════════════════
   UniHER Platform Types — Full Demo
   ═══════════════════════════════════════════════════════════════ */

export type UserRole = 'admin' | 'rh' | 'lideranca' | 'colaboradora';

import type { ProtectedMetric } from '@/types/privacy';

export type ArchetypeKey = 'guardia' | 'protetora' | 'guerreira' | 'equilibrista';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  isMasterAdmin?: boolean;
  avatar?: string;
  department?: string;
  joinedAt: string;
  nickname?: string | null;
  also_collaborator?: number;
  can_approve?: number;
  mustChangePassword?: boolean;
  firstAccessTourCompleted?: boolean;
}

export const DASHBOARD_PERIODS = ['1m', '3m', '6m', '1a'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const HISTORY_PERIODS = ['3', '6', '12'] as const;
export type HistoryPeriod = (typeof HISTORY_PERIODS)[number];

export const COMMUNICATION_PERIODS = ['7', '30', '90'] as const;
export type CommunicationPeriod = (typeof COMMUNICATION_PERIODS)[number];

export interface ProtectedDashboardMetrics {
  examActivity: ProtectedMetric<number>;
  engagement: ProtectedMetric<never>;
  healthRisk: ProtectedMetric<never>;
  campaignParticipation: ProtectedMetric<never>;
  roi: ProtectedMetric<never>;
}

export interface ProtectedDepartmentMetric {
  id: string;
  name: string;
  color: string;
  metric: ProtectedMetric<number>;
}

export interface ProtectedAgeMetric {
  label: string;
  color: string;
  metric: ProtectedMetric<number>;
}

export interface ProtectedSeriesMetric {
  period: string;
  metric: ProtectedMetric<number>;
}

export interface ProtectedDashboardProjection {
  filters: {
    period: DashboardPeriod;
    departmentId?: string;
  };
  metrics: ProtectedDashboardMetrics;
  departments: ProtectedDepartmentMetric[];
  ageDistribution: ProtectedAgeMetric[];
  examActivitySeries: ProtectedSeriesMetric[];
}

export type SafeCommunicationAction =
  | 'campaign_delivery'
  | 'lesson_delivery';

export interface ProtectedCommunicationMetric {
  action: SafeCommunicationAction;
  label: string;
  metric: ProtectedMetric<number>;
}

export interface ProtectedCommunicationsProjection {
  filters: { period: CommunicationPeriod };
  actions: ProtectedCommunicationMetric[];
}

export interface UnavailableHistoryProjection {
  status: 'unavailable';
  reason: 'eligible_ledger_required';
  message: 'Hist\u00f3rico indispon\u00edvel at\u00e9 existir um registro eleg\u00edvel e protegido.';
}

export interface CampaignStatus {
  name: string;
  month: string;
  progress: number;
  status: 'done' | 'active' | 'next';
  statusLabel: string;
  color: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  points: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  points: number;
  deadline?: string;
  status: 'active' | 'completed' | 'locked';
  category: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface CompanyProfile {
  logo?: string;
  name: string;
  tradeName: string;
  cnpj: string;
  sector: string;
  collaboratorCount: number;
  memberSince: string;
  plan: string;
  missionsActive: number;
  totalPoints: number;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface CollaboratorHome {
  greeting: string;
  userName: string;
  date: string;
  healthAlert: string;
  examsPercent: number;
  examsTotal: number;
  contentViewed: number;
  campaignsActive: number;
  campaignsTotal: number;
  streakDays: number;
  level: number;
  points: number;
  pointsNextLevel: number;
  achievementCount: number;
  engagementStats: {
    streakDays: number;
    openRate: number;
    actionsToday: number;
  };
}

export interface SemaforoItem {
  dimension: string;
  status: 'green' | 'yellow' | 'red';
  score: number;
  recommendation: string;
  icon: string;
}

export interface NotificationItem {
  id: string;
  type: 'badge' | 'level' | 'campaign' | 'challenge' | 'alert';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
