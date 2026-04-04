/* ═══════════════════════════════════════════════════════════════
   UniHER Platform Types — Full Demo
   ═══════════════════════════════════════════════════════════════ */

export type UserRole = 'admin' | 'rh' | 'lideranca' | 'colaboradora';

export type ArchetypeKey = 'guardia' | 'protetora' | 'guerreira' | 'equilibrista';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isMasterAdmin?: boolean;
  avatar?: string;
  department?: string;
  level: number;
  points: number;
  streak: number;
  joinedAt: string;
  nickname?: string | null;
  also_collaborator?: number;
  can_approve?: number;
  mustChangePassword?: boolean;
  firstAccessTourCompleted?: boolean;
}

export interface Department {
  id: string;
  name: string;
  collaborators: number;
  points: number;
  level: number;
  badges: number;
  engagementPercent: number;
  examsPercent: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export interface DashboardKPI {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'stable';
  color?: string;
}

export interface ROIProjection {
  roiMultiplier: number;
  savings: string;
  absenteeismReduction: string;
}

export interface CampaignStatus {
  name: string;
  month: string;
  progress: number;
  status: 'done' | 'active' | 'next';
  statusLabel: string;
  color: string;
}

export interface EngagementDataPoint {
  month: string;
  engagement: number;
  retention: number;
}

export interface AgeDistribution {
  label: string;
  percent: number;
  color: string;
}

export interface HealthRisk {
  month: string;
  low: number;
  medium: number;
  high: number;
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

export interface ConviteStatus {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}

export interface ReportConfig {
  type: 'weekly' | 'monthly';
  label: string;
  description: string;
  schedule: string;
  enabled: boolean;
  recipientEmail: string;
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
