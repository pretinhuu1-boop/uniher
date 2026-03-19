'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

import StatCard from '@/components/platform/StatCard';
import {
  DEPARTMENTS,
  DASHBOARD_KPIS,
  ROI_DATA,
  CAMPAIGNS_DASHBOARD,
  ENGAGEMENT_OVER_TIME,
  AGE_DISTRIBUTION,
  HEALTH_RISK_EVOLUTION,
  CONVITES,
  REPORTS,
  RANKING_PODIUM,
  CONQUISTAS_POR_DEPTO,
} from '@/data/mock-dashboard';
import type { DashboardKPI, ROIProjection, EngagementDataPoint, HealthRisk } from '@/types/platform';

import styles from './dashboard.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
);

const PERIOD_OPTIONS = ['1m', '3m', '6m', '1a'];
const DEPT_CHIPS = ['TI', 'RH', 'Financeiro', 'Marketing', 'Operações'];

/* ═══════════════════════════════════════════════════════════════
   DEPARTMENT-SPECIFIC KPI DATA
   When a department filter is active, KPIs reflect that dept.
   ═══════════════════════════════════════════════════════════════ */
const DEPT_KPIS: Record<string, Record<string, DashboardKPI[]>> = {
  RH: {
    '1m': [
      { label: 'Colaboradoras Ativas', value: 48, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 48 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '92%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +excelente', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '88%', subtitle: 'da população', icon: 'heart', trend: '↑ excelente', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 156, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '3m': [
      { label: 'Colaboradoras Ativas', value: 48, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 48 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '90%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '86%', subtitle: 'da população', icon: 'heart', trend: '↑ bom', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 312, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '6m': [
      { label: 'Colaboradoras Ativas', value: 48, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 48 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '92%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +excelente', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '88%', subtitle: 'da população', icon: 'heart', trend: '↑ excelente', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 480, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '1a': [
      { label: 'Colaboradoras Ativas', value: 48, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 48 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '94%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +excelente', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '91%', subtitle: 'da população', icon: 'heart', trend: '↑ excelente', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 720, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
  },
  Marketing: {
    '1m': [
      { label: 'Colaboradoras Ativas', value: 124, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 124 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '88%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '75%', subtitle: 'da população', icon: 'heart', trend: '↑ melhorando', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 324, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '3m': [
      { label: 'Colaboradoras Ativas', value: 124, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 124 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '86%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '73%', subtitle: 'da população', icon: 'heart', trend: '↑ melhorando', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 580, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '6m': [
      { label: 'Colaboradoras Ativas', value: 124, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 124 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '88%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '75%', subtitle: 'da população', icon: 'heart', trend: '↑ melhorando', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 890, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '1a': [
      { label: 'Colaboradoras Ativas', value: 124, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 124 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '91%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +excelente', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '80%', subtitle: 'da população', icon: 'heart', trend: '↑ bom', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 1520, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
  },
  TI: {
    '1m': [
      { label: 'Colaboradoras Ativas', value: 156, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 156 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '85%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '70%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 210, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '3m': [
      { label: 'Colaboradoras Ativas', value: 156, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 156 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '83%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '68%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 445, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '6m': [
      { label: 'Colaboradoras Ativas', value: 156, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 156 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '85%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '70%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 680, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
    '1a': [
      { label: 'Colaboradoras Ativas', value: 156, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 156 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '89%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '76%', subtitle: 'da população', icon: 'heart', trend: '↑ melhorando', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 1180, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
  },
  Financeiro: {
    '1m': [
      { label: 'Colaboradoras Ativas', value: 92, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 92 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '78%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '→ estável', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '68%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 98, subtitle: 'desafios e badges', icon: 'activity', trend: '→ estável', trendDirection: 'up', color: '#D4B060' },
    ],
    '3m': [
      { label: 'Colaboradoras Ativas', value: 92, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 92 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '76%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '→ estável', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '66%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 215, subtitle: 'desafios e badges', icon: 'activity', trend: '→ estável', trendDirection: 'up', color: '#D4B060' },
    ],
    '6m': [
      { label: 'Colaboradoras Ativas', value: 92, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 92 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '78%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '→ estável', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '68%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 380, subtitle: 'desafios e badges', icon: 'activity', trend: '→ estável', trendDirection: 'up', color: '#D4B060' },
    ],
    '1a': [
      { label: 'Colaboradoras Ativas', value: 92, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 92 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '82%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ melhorando', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '74%', subtitle: 'da população', icon: 'heart', trend: '↑ melhorando', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 620, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
  },
  Comercial: {
    '1m': [
      { label: 'Colaboradoras Ativas', value: 80, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '→ 80 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '74%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '→ estável', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '65%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 76, subtitle: 'desafios e badges', icon: 'activity', trend: '→ estável', trendDirection: 'up', color: '#D4B060' },
    ],
    '3m': [
      { label: 'Colaboradoras Ativas', value: 80, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '→ 80 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '72%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '→ estável', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '63%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 168, subtitle: 'desafios e badges', icon: 'activity', trend: '→ estável', trendDirection: 'up', color: '#D4B060' },
    ],
    '6m': [
      { label: 'Colaboradoras Ativas', value: 80, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '→ 80 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '74%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '→ estável', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '65%', subtitle: 'da população', icon: 'heart', trend: '→ estável', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 290, subtitle: 'desafios e badges', icon: 'activity', trend: '→ estável', trendDirection: 'up', color: '#D4B060' },
    ],
    '1a': [
      { label: 'Colaboradoras Ativas', value: 80, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '→ 80 total', trendDirection: 'up', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '79%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ melhorando', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '71%', subtitle: 'da população', icon: 'heart', trend: '↑ melhorando', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 485, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
  },
  'Operações': {
    '1m': [
      { label: 'Colaboradoras Ativas', value: 312, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↓ 312 total', trendDirection: 'down', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '65%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↓ atenção', trendDirection: 'down', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '58%', subtitle: 'da população', icon: 'heart', trend: '↓ atenção', trendDirection: 'down', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 142, subtitle: 'desafios e badges', icon: 'activity', trend: '↓ baixo', trendDirection: 'down', color: '#D4B060' },
    ],
    '3m': [
      { label: 'Colaboradoras Ativas', value: 312, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↓ 312 total', trendDirection: 'down', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '63%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↓ atenção', trendDirection: 'down', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '55%', subtitle: 'da população', icon: 'heart', trend: '↓ atenção', trendDirection: 'down', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 298, subtitle: 'desafios e badges', icon: 'activity', trend: '↓ baixo', trendDirection: 'down', color: '#D4B060' },
    ],
    '6m': [
      { label: 'Colaboradoras Ativas', value: 312, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↓ 312 total', trendDirection: 'down', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '65%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↓ atenção', trendDirection: 'down', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '58%', subtitle: 'da população', icon: 'heart', trend: '↓ atenção', trendDirection: 'down', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 520, subtitle: 'desafios e badges', icon: 'activity', trend: '↓ baixo', trendDirection: 'down', color: '#D4B060' },
    ],
    '1a': [
      { label: 'Colaboradoras Ativas', value: 312, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↓ 312 total', trendDirection: 'down', color: '#E8849E' },
      { label: 'Taxa de Engajamento', value: '70%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ melhorando', trendDirection: 'up', color: '#3E7D5A' },
      { label: 'Exames em Dia', value: '64%', subtitle: 'da população', icon: 'heart', trend: '↑ melhorando', trendDirection: 'up', color: '#C85C7E' },
      { label: 'Atividades Completadas', value: 890, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
    ],
  },
};
const KPI_SUBTABS = ['Engajamento', 'Exames em Dia', 'Participação Campanhas', 'Desafios Concluídos'];
const GAM_TABS = ['Ranking', 'Badges', 'Progresso'];

/* ═══════════════════════════════════════════════════════════════
   BADGES PER DEPARTMENT
   ═══════════════════════════════════════════════════════════════ */
const DEPT_BADGES: Record<string, { name: string; icon: string; unlocked: boolean }[]> = {
  'Operações': [
    { name: 'Mais Engajado', icon: '🔥', unlocked: true },
    { name: 'Top Pontuação', icon: '⭐', unlocked: true },
    { name: '100% Exames', icon: '💗', unlocked: false },
  ],
  'TI': [
    { name: 'Inovador', icon: '💡', unlocked: true },
    { name: 'Streak 30 dias', icon: '🔥', unlocked: true },
    { name: 'Desafio Master', icon: '🏆', unlocked: false },
  ],
  'RH': [
    { name: 'Líder de Engajamento', icon: '👑', unlocked: true },
    { name: 'Bem-Estar Total', icon: '🧘', unlocked: false },
    { name: 'Mentora', icon: '🌟', unlocked: false },
  ],
  'Financeiro': [
    { name: 'Pontualidade', icon: '⏰', unlocked: true },
    { name: 'Meta Batida', icon: '🎯', unlocked: true },
    { name: '100% Exames', icon: '💗', unlocked: false },
  ],
  'Marketing': [
    { name: 'Criatividade', icon: '🎨', unlocked: true },
    { name: 'Campanha Top', icon: '📣', unlocked: true },
    { name: 'Influenciadora', icon: '✨', unlocked: false },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   PROGRESS PER DEPARTMENT
   ═══════════════════════════════════════════════════════════════ */
const DEPT_PROGRESS: Record<string, { label: string; value: number }[]> = {
  'RH': [
    { label: 'Engajamento', value: 92 },
    { label: 'Exames em dia', value: 85 },
    { label: 'Desafios concluídos', value: 78 },
  ],
  'Marketing': [
    { label: 'Engajamento', value: 88 },
    { label: 'Exames em dia', value: 72 },
    { label: 'Desafios concluídos', value: 65 },
  ],
  'TI': [
    { label: 'Engajamento', value: 85 },
    { label: 'Exames em dia', value: 90 },
    { label: 'Desafios concluídos', value: 82 },
  ],
  'Financeiro': [
    { label: 'Engajamento', value: 80 },
    { label: 'Exames em dia', value: 88 },
    { label: 'Desafios concluídos', value: 70 },
  ],
  'Operações': [
    { label: 'Engajamento', value: 76 },
    { label: 'Exames em dia', value: 68 },
    { label: 'Desafios concluídos', value: 60 },
  ],
};

/* ═══════════════════════════════════════════════════════════════
   INITIAL METAS
   ═══════════════════════════════════════════════════════════════ */
interface Meta {
  dept: string;
  goal: string;
  current: number;
  target: number;
  deadline: string;
}

const INITIAL_METAS: Meta[] = [
  { dept: 'RH', goal: 'Atingir 95% de engajamento', current: 92, target: 95, deadline: 'Mar/2026' },
  { dept: 'TI', goal: 'Reduzir absenteísmo em 15%', current: 78, target: 85, deadline: 'Abr/2026' },
  { dept: 'Marketing', goal: '100% exames em dia', current: 75, target: 100, deadline: 'Jun/2026' },
];

/* ═══════════════════════════════════════════════════════════════
   PERIOD-KEYED MOCK DATA
   All data varies by selected period so the demo feels alive.
   ═══════════════════════════════════════════════════════════════ */

const KPIS_BY_PERIOD: Record<string, DashboardKPI[]> = {
  '1m': [
    { label: 'Colaboradoras Ativas', value: 780, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 780 total', trendDirection: 'up', color: '#E8849E' },
    { label: 'Taxa de Engajamento', value: '88%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
    { label: 'Exames em Dia', value: '70%', subtitle: 'da população', icon: 'heart', trend: '↑ 0 colaboradoras', trendDirection: 'up', color: '#C85C7E' },
    { label: 'Atividades Completadas', value: 320, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
  ],
  '3m': [
    { label: 'Colaboradoras Ativas', value: 795, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 795 total', trendDirection: 'up', color: '#E8849E' },
    { label: 'Taxa de Engajamento', value: '90%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +bom', trendDirection: 'up', color: '#3E7D5A' },
    { label: 'Exames em Dia', value: '72%', subtitle: 'da população', icon: 'heart', trend: '↑ 0 colaboradoras', trendDirection: 'up', color: '#C85C7E' },
    { label: 'Atividades Completadas', value: 680, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
  ],
  '6m': DASHBOARD_KPIS,
  '1a': [
    { label: 'Colaboradoras Ativas', value: 812, subtitle: 'ativas nos últimos 7 dias', icon: 'users', trend: '↑ 812 total', trendDirection: 'up', color: '#E8849E' },
    { label: 'Taxa de Engajamento', value: '94%', subtitle: 'últimos 30 dias', icon: 'trending-up', trend: '↑ +excelente', trendDirection: 'up', color: '#3E7D5A' },
    { label: 'Exames em Dia', value: '78%', subtitle: 'da população', icon: 'heart', trend: '↑ 0 colaboradoras', trendDirection: 'up', color: '#C85C7E' },
    { label: 'Atividades Completadas', value: 2450, subtitle: 'desafios e badges', icon: 'activity', trend: '↑ +ativo', trendDirection: 'up', color: '#D4B060' },
  ],
};

const ROI_BY_PERIOD: Record<string, ROIProjection> = {
  '1m': { roiMultiplier: 3.2, savings: 'R$ 95k', absenteeismReduction: '-18%' },
  '3m': { roiMultiplier: 3.8, savings: 'R$ 165k', absenteeismReduction: '-20%' },
  '6m': ROI_DATA,
  '1a': { roiMultiplier: 5.2, savings: 'R$ 520k', absenteeismReduction: '-27%' },
};

/** 12-month extended engagement dataset (Jan-Dez) */
const ENGAGEMENT_12M: EngagementDataPoint[] = [
  { month: 'Jan', engagement: 25, retention: 40 },
  { month: 'Fev', engagement: 30, retention: 43 },
  { month: 'Mar', engagement: 32, retention: 45 },
  { month: 'Abr', engagement: 35, retention: 48 },
  { month: 'Mai', engagement: 38, retention: 50 },
  { month: 'Jun', engagement: 40, retention: 53 },
  { month: 'Jul', engagement: 42, retention: 55 },
  { month: 'Ago', engagement: 58, retention: 62 },
  { month: 'Set', engagement: 72, retention: 70 },
  { month: 'Out', engagement: 78, retention: 75 },
  { month: 'Nov', engagement: 85, retention: 78 },
  { month: 'Dez', engagement: 92, retention: 82 },
];

/** 12-month extended health risk dataset (Jan-Dez) */
const HEALTH_RISK_12M: HealthRisk[] = [
  { month: 'Jan', low: 32, medium: 38, high: 30 },
  { month: 'Fev', low: 35, medium: 37, high: 28 },
  { month: 'Mar', low: 38, medium: 36, high: 26 },
  { month: 'Abr', low: 41, medium: 35, high: 24 },
  { month: 'Mai', low: 44, medium: 34, high: 22 },
  { month: 'Jun', low: 47, medium: 32, high: 21 },
  { month: 'Jul', low: 50, medium: 30, high: 20 },
  { month: 'Ago', low: 55, medium: 28, high: 17 },
  { month: 'Set', low: 60, medium: 26, high: 14 },
  { month: 'Out', low: 65, medium: 23, high: 12 },
  { month: 'Nov', low: 70, medium: 20, high: 10 },
  { month: 'Dez', low: 75, medium: 17, high: 8 },
];

/** How many trailing months to show per period */
const PERIOD_MONTHS: Record<string, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1a': 12,
};

const META_TEXT: Record<string, string> = {
  '1m': 'Última atualização: 30 dias atrás',
  '3m': 'Última atualização: 3 meses atrás',
  '6m': 'Última atualização: agora',
  '1a': 'Última atualização: 12 meses de dados',
};

/**
 * Hook for temporary button feedback: returns [label, trigger].
 * When triggered, the label changes to successText for 2 seconds then reverts.
 */
function useButtonFeedback(defaultLabel: string, successLabel: string, duration = 2000) {
  const [label, setLabel] = useState(defaultLabel);
  const trigger = useCallback(() => {
    setLabel(successLabel);
    setTimeout(() => setLabel(defaultLabel), duration);
  }, [defaultLabel, successLabel, duration]);
  return [label, trigger] as const;
}

export default function DashboardPage() {
  const [activePeriod, setActivePeriod] = useState('6m');
  const [realtime, setRealtime] = useState(false);
  const [deptView, setDeptView] = useState<'cards' | 'chart'>('cards');
  const [activeDeptChip, setActiveDeptChip] = useState<string | null>(null);
  const [activeKpiTab, setActiveKpiTab] = useState('Engajamento');
  const [activeGamTab, setActiveGamTab] = useState('Ranking');
  const [selectedConqDept, setSelectedConqDept] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState('2024-12');

  // Filter states (#7-9) — filterPeriod removed; Período select syncs with activePeriod
  const [filterDept, setFilterDept] = useState('');
  const [filterHealth, setFilterHealth] = useState('');

  // Convites search & filter (#10-11)
  const [conviteSearch, setConviteSearch] = useState('');
  const [conviteFilter, setConviteFilter] = useState('Todos');

  // Report toggle states (#12)
  const [reportToggles, setReportToggles] = useState<Record<string, boolean>>(
    () => Object.fromEntries(REPORTS.map(r => [r.type, r.enabled]))
  );

  // Button feedback states (#1-6)
  const [convidarLabel, triggerConvidar] = useButtonFeedback('Convidar', '✓ Convite enviado!');
  const [exportarLabel, triggerExportar] = useButtonFeedback('Exportar', '✓ Exportado!');
  // Metas state
  const [metas, setMetas] = useState<Meta[]>(INITIAL_METAS);
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [newMeta, setNewMeta] = useState({ dept: '', goal: '', target: '', deadline: '' });

  const handleAddMeta = useCallback(() => {
    if (!newMeta.dept || !newMeta.goal || !newMeta.target || !newMeta.deadline) return;
    setMetas(prev => [...prev, {
      dept: newMeta.dept,
      goal: newMeta.goal,
      current: 0,
      target: Number(newMeta.target),
      deadline: newMeta.deadline,
    }]);
    setNewMeta({ dept: '', goal: '', target: '', deadline: '' });
    setShowMetaForm(false);
  }, [newMeta]);

  const [pdfLabel, triggerPdf] = useButtonFeedback('Gerar PDF / Imprimir', '✓ PDF gerado!');
  const [htmlLabel, triggerHtml] = useButtonFeedback('Baixar HTML', '✓ HTML baixado!');

  // Per-report "Enviar agora" feedback
  const [enviarLabels, setEnviarLabels] = useState<Record<string, string>>(
    () => Object.fromEntries(REPORTS.map(r => [r.type, 'Enviar agora']))
  );
  const triggerEnviar = useCallback((type: string) => {
    setEnviarLabels(prev => ({ ...prev, [type]: '✓ Enviado!' }));
    setTimeout(() => {
      setEnviarLabels(prev => ({ ...prev, [type]: 'Enviar agora' }));
    }, 2000);
  }, []);

  /* ─── Period-derived data (department-aware) ─── */
  const activeKpis = useMemo(() => {
    if (filterDept && DEPT_KPIS[filterDept]) {
      return DEPT_KPIS[filterDept][activePeriod] ?? DEPT_KPIS[filterDept]['6m'];
    }
    return KPIS_BY_PERIOD[activePeriod] ?? DASHBOARD_KPIS;
  }, [activePeriod, filterDept]);
  const activeRoi = useMemo(() => ROI_BY_PERIOD[activePeriod] ?? ROI_DATA, [activePeriod]);

  const slicedEngagement = useMemo(() => {
    const n = PERIOD_MONTHS[activePeriod] ?? 6;
    return ENGAGEMENT_12M.slice(-n);
  }, [activePeriod]);

  const slicedHealthRisk = useMemo(() => {
    const n = PERIOD_MONTHS[activePeriod] ?? 6;
    return HEALTH_RISK_12M.slice(-n);
  }, [activePeriod]);

  const metaText = META_TEXT[activePeriod] ?? 'Última atualização: agora';

  const totalCollaborators = DEPARTMENTS.reduce((s, d) => s + d.collaborators, 0);

  /** Clear all filters helper */
  const clearFilters = useCallback(() => {
    setFilterDept('');
    setFilterHealth('');
  }, []);

  /** Whether any filter is active */
  const hasActiveFilters = filterDept !== '' || filterHealth !== '';

  /** Build human-readable filter description */
  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (filterDept) parts.push(filterDept);
    if (filterHealth) parts.push(filterHealth);
    return parts.join(' \u00B7 ');
  }, [filterDept, filterHealth]);

  /* ─── Filtered departments based on filter row selects ─── */
  const filteredByFilters = DEPARTMENTS.filter(d => {
    if (filterDept && d.name !== filterDept) return false;
    if (filterHealth) {
      if (filterHealth === 'Risco Baixo' && d.engagementPercent < 80) return false;
      if (filterHealth === 'Risco Médio' && (d.engagementPercent < 60 || d.engagementPercent >= 80)) return false;
      if (filterHealth === 'Risco Alto' && d.engagementPercent >= 60) return false;
    }
    return true;
  });

  /** Dynamic highlights based on filtered departments */
  const computedHighlights = useMemo(() => {
    const depts = filteredByFilters.length > 0 ? filteredByFilters : DEPARTMENTS;
    const bestEng = [...depts].sort((a, b) => b.engagementPercent - a.engagementPercent)[0];
    const bestExm = [...depts].sort((a, b) => b.examsPercent - a.examsPercent)[0];
    const worst = [...depts].sort((a, b) => a.engagementPercent - b.engagementPercent)[0];
    return {
      bestEngagement: { dept: bestEng.name, value: `${bestEng.engagementPercent}%` },
      bestExams: { dept: bestExm.name, value: `${bestExm.examsPercent}%` },
      needsAttention: { dept: worst.name, value: `${worst.engagementPercent}%` },
    };
  }, [filteredByFilters]);

  /** Dynamic meta row text reflecting active filters */
  const computedMetaText = useMemo(() => {
    const parts: string[] = [metaText];
    if (filterHealth) {
      parts.push(`Mostrando: ${filterHealth}`);
      parts.push(`${filteredByFilters.length} departamento${filteredByFilters.length !== 1 ? 's' : ''}`);
    } else {
      parts.push(`${totalCollaborators} colaboradoras ativas`);
    }
    return parts.join(' \u00B7 ');
  }, [metaText, filterHealth, filteredByFilters.length, totalCollaborators]);

  /* ─── Chart Configs ─── */

  const engagementChartData = useMemo(() => ({
    labels: slicedEngagement.map(d => d.month),
    datasets: [
      {
        label: 'Engajamento %',
        data: slicedEngagement.map(d => d.engagement),
        borderColor: '#C85C7E',
        backgroundColor: 'rgba(200,92,126,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#C85C7E',
      },
      {
        label: 'Retenção %',
        data: slicedEngagement.map(d => d.retention),
        borderColor: '#3E7D5A',
        backgroundColor: 'rgba(62,125,90,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#3E7D5A',
      },
    ],
  }), [slicedEngagement]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      y: { min: 0, max: 100, ticks: { font: { size: 10 } }, grid: { color: 'rgba(180,130,150,0.08)' } },
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
    },
  };

  const ageDoughnutData = {
    labels: AGE_DISTRIBUTION.map(d => d.label),
    datasets: [
      {
        data: AGE_DISTRIBUTION.map(d => d.percent),
        backgroundColor: AGE_DISTRIBUTION.map(d => d.color),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
    },
    cutout: '60%',
  };

  const healthAreaData = useMemo(() => ({
    labels: slicedHealthRisk.map(d => d.month),
    datasets: [
      {
        label: 'Risco Baixo',
        data: slicedHealthRisk.map(d => d.low),
        borderColor: '#3E7D5A',
        backgroundColor: 'rgba(62,125,90,0.15)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Risco Médio',
        data: slicedHealthRisk.map(d => d.medium),
        borderColor: '#D4B060',
        backgroundColor: 'rgba(212,176,96,0.15)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Risco Alto',
        data: slicedHealthRisk.map(d => d.high),
        borderColor: '#C85C7E',
        backgroundColor: 'rgba(200,92,126,0.15)',
        fill: true,
        tension: 0.4,
      },
    ],
  }), [slicedHealthRisk]);

  const deptBarData = {
    labels: filteredByFilters.map(d => d.name),
    datasets: [
      {
        label: 'Engajamento %',
        data: filteredByFilters.map(d => d.engagementPercent),
        backgroundColor: '#C85C7E',
        borderRadius: 4,
      },
      {
        label: 'Exames em dia %',
        data: filteredByFilters.map(d => d.examsPercent),
        backgroundColor: '#3E7D5A',
        borderRadius: 4,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { display: true, position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      x: { min: 0, max: 100, ticks: { font: { size: 10 } }, grid: { color: 'rgba(180,130,150,0.08)' } },
      y: { ticks: { font: { size: 10 } }, grid: { display: false } },
    },
  };

  const filteredDepts = activeDeptChip
    ? filteredByFilters.filter(d => d.name === activeDeptChip)
    : filteredByFilters;

  const totalPoints = DEPARTMENTS.reduce((s, d) => s + d.points, 0);
  const avgLevel = Math.round(DEPARTMENTS.reduce((s, d) => s + d.level, 0) / DEPARTMENTS.length);

  return (
    <div className={styles.page}>
      {/* ════════════ PAGE HEADER ════════════ */}
      <div className={styles.headerTop}>
        <div className={styles.headerLeft}>
          <span className={styles.companyBadge}>OFG</span>
          <h1 className={styles.pageTitle}>Dashboard RH</h1>
          <p className={styles.pageSubtitle}>
            Visão geral da saúde e engajamento das colaboradoras da sua empresa.
          </p>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.periodRow}>
            <div className={styles.periodBtns}>
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p}
                  className={`${styles.periodBtn} ${activePeriod === p ? styles.periodBtnActive : ''}`}
                  onClick={() => setActivePeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <label className={styles.toggleLabel}>
              <button
                className={`${styles.toggle} ${realtime ? styles.toggleActive : ''}`}
                onClick={() => setRealtime(!realtime)}
                aria-label="Toggle tempo real"
              />
              Tempo real
            </label>
          </div>

          <div className={styles.actionBtns}>
            <button className={styles.btnOutline} onClick={triggerConvidar}>{convidarLabel}</button>
            <button className={styles.btnFilled} onClick={triggerExportar}>{exportarLabel}</button>
          </div>
        </div>
      </div>

      <p className={styles.metaRow}>
        {computedMetaText}
      </p>

      {/* ── Filter Row ── */}
      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
        >
          <option value="">Departamento</option>
          {DEPARTMENTS.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={filterHealth}
          onChange={e => setFilterHealth(e.target.value)}
        >
          <option value="">Status de Saúde</option>
          <option value="Risco Baixo">Risco Baixo</option>
          <option value="Risco Médio">Risco Médio</option>
          <option value="Risco Alto">Risco Alto</option>
        </select>
        <select
          className={styles.filterSelect}
          value={activePeriod}
          onChange={e => setActivePeriod(e.target.value)}
        >
          <option value="1m">Último mês</option>
          <option value="3m">Últimos 3 meses</option>
          <option value="6m">Últimos 6 meses</option>
          <option value="1a">Último ano</option>
        </select>
      </div>

      {/* ── Active Filter Indicator ── */}
      {hasActiveFilters && (
        <div className={styles.filterActiveRow}>
          <span className={styles.filterActiveText}>
            Filtrando por: {activeFilterLabel}
          </span>
          <button className={styles.filterClearBtn} onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>
      )}

      {/* ════════════ KPI CARDS ════════════ */}
      <div className={styles.kpiGrid}>
        {activeKpis.map((kpi, i) => (
          <StatCard key={i} kpi={kpi} />
        ))}
      </div>

      {/* ════════════ ROI BANNER ════════════ */}
      <div className={styles.roiBanner}>
        <div className={styles.roiLeft}>
          <h3>Projeção de ROI em Tempo Real</h3>
          <p>Baseado na redução de absenteísmo e sinistralidade</p>
        </div>
        <div className={styles.roiRight}>
          <div className={styles.roiStat}>
            <div className={styles.roiStatValue}>{activeRoi.roiMultiplier}x</div>
            <div className={styles.roiStatLabel}>ROI Atual</div>
          </div>
          <div className={styles.roiStat}>
            <div className={styles.roiStatValue}>{activeRoi.savings}</div>
            <div className={styles.roiStatLabel}>Economia Estimada</div>
          </div>
          <div className={styles.roiStat}>
            <div className={styles.roiStatValue}>{activeRoi.absenteeismReduction}</div>
            <div className={styles.roiStatLabel}>Absenteísmo</div>
          </div>
        </div>
      </div>

      {/* ════════════ CHARTS ROW 1 ════════════ */}
      <div className={styles.twoCol}>
        {/* Engagement Line Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Evolução do Engajamento</div>
              <div className={styles.cardSubtitle}>
                {activePeriod === '1m' ? 'Último mês' : activePeriod === '3m' ? 'Últimos 3 meses' : activePeriod === '1a' ? 'Últimos 12 meses' : 'Últimos 6 meses'}
              </div>
            </div>
          </div>
          <div className={styles.chartWrap}>
            <Line data={engagementChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Age Doughnut */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Distribuição por Idade</div>
              <div className={styles.cardSubtitle}>Dados demográficos</div>
            </div>
          </div>
          <div className={styles.doughnutWrap}>
            <Doughnut data={ageDoughnutData} options={doughnutOptions} />
          </div>
          <div className={styles.chartLegend}>
            {AGE_DISTRIBUTION.map(a => (
              <span key={a.label} className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: a.color }} />
                {a.label} ({a.percent}%)
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════ CHARTS ROW 2 ════════════ */}
      <div className={styles.twoCol}>
        {/* Engagement Trend (annual) */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Evolução do Engajamento</div>
              <div className={styles.cardSubtitle}>Tendência anual</div>
            </div>
            <span className={styles.badge}>+95% em 12 meses</span>
          </div>
          <div className={styles.chartWrap}>
            <Line data={engagementChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Health Risk Evolution */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Evolução da Saúde Populacional</div>
              <div className={styles.cardSubtitle}>Distribuição de risco</div>
            </div>
            <span className={`${styles.badge} ${styles.badgeRose}`}>-35% risco alto</span>
          </div>
          <div className={styles.chartWrap}>
            <Line data={healthAreaData} options={lineChartOptions} />
          </div>
        </div>
      </div>

      {/* ════════════ DEPARTMENT SECTION ════════════ */}
      <div className={styles.card}>
        <div className={styles.deptHeader}>
          <div className={styles.cardTitle}>Comparativo entre Departamentos</div>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${deptView === 'cards' ? styles.viewBtnActive : ''}`}
              onClick={() => setDeptView('cards')}
            >
              Cards
            </button>
            <button
              className={`${styles.viewBtn} ${deptView === 'chart' ? styles.viewBtnActive : ''}`}
              onClick={() => setDeptView('chart')}
            >
              Gráficos
            </button>
          </div>
        </div>

        <div className={styles.chipRow}>
          {DEPT_CHIPS.map(chip => (
            <button
              key={chip}
              className={`${styles.chip} ${activeDeptChip === chip ? styles.chipActive : ''}`}
              onClick={() => setActiveDeptChip(activeDeptChip === chip ? null : chip)}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className={styles.kpiTabs}>
          {KPI_SUBTABS.map(tab => (
            <button
              key={tab}
              className={`${styles.kpiTab} ${activeKpiTab === tab ? styles.kpiTabActive : ''}`}
              onClick={() => setActiveKpiTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className={styles.deptCards}>
          {filteredDepts.map(dept => (
            <div key={dept.id} className={styles.deptCard}>
              <div className={styles.deptName}>{dept.name}</div>
              <div className={styles.deptEngagement}>{dept.engagementPercent}%</div>
              <div className={styles.deptMeta}>{dept.collaborators} colaboradoras &middot; {dept.points.toLocaleString('pt-BR')} pts</div>
              <span className={`${styles.deptTrend} ${
                dept.trend === 'up' ? styles.trendUp : dept.trend === 'down' ? styles.trendDown : styles.trendStable
              }`}>
                {dept.trend === 'up' ? '↑' : dept.trend === 'down' ? '↓' : '→'} {dept.trend === 'up' ? 'Crescendo' : dept.trend === 'down' ? 'Atenção' : 'Estável'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ HIGHLIGHTS BAR ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardTitle} style={{ marginBottom: 16 }}>Destaques</div>
        <div className={styles.highlightsBar}>
          <div className={styles.highlightCard}>
            <div className={styles.highlightLabel}>Maior Engajamento</div>
            <div className={styles.highlightDept}>{computedHighlights.bestEngagement.dept}</div>
            <div className={styles.highlightValue}>{computedHighlights.bestEngagement.value}</div>
          </div>
          <div className={styles.highlightCard}>
            <div className={styles.highlightLabel}>Mais Exames em Dia</div>
            <div className={styles.highlightDept}>{computedHighlights.bestExams.dept}</div>
            <div className={styles.highlightValue}>{computedHighlights.bestExams.value}</div>
          </div>
          <div className={`${styles.highlightCard} ${styles.highlightAttention}`}>
            <div className={styles.highlightLabel}>Precisa de Atenção</div>
            <div className={styles.highlightDept}>{computedHighlights.needsAttention.dept}</div>
            <div className={styles.highlightValue}>{computedHighlights.needsAttention.value}</div>
          </div>
        </div>
      </div>

      {/* ════════════ GAMIFICATION ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Gamificação por Departamento</div>
          <div className={styles.gamHeader}>
            <div className={styles.gamStat}>
              <div className={styles.gamStatValue}>{totalPoints.toLocaleString('pt-BR')}</div>
              <div className={styles.gamStatLabel}>Pontos Totais</div>
            </div>
            <div className={styles.gamStat}>
              <div className={styles.gamStatValue}>Nv. {avgLevel}</div>
              <div className={styles.gamStatLabel}>Média de Nível</div>
            </div>
          </div>
        </div>

        <div className={styles.gamTabs}>
          {GAM_TABS.map(tab => (
            <button
              key={tab}
              className={`${styles.gamTab} ${activeGamTab === tab ? styles.gamTabActive : ''}`}
              onClick={() => setActiveGamTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeGamTab === 'Ranking' && (
          <>
            <div className={styles.podium}>
              {/* 2nd place */}
              <div className={styles.podiumItem}>
                <span className={styles.podiumIcon}>{RANKING_PODIUM[1].icon}</span>
                <div className={`${styles.podiumBar} ${styles.podiumBar2}`}>2</div>
                <span className={styles.podiumName}>{RANKING_PODIUM[1].department}</span>
                <span className={styles.podiumPoints}>{RANKING_PODIUM[1].points.toLocaleString('pt-BR')} pts</span>
              </div>
              {/* 1st place */}
              <div className={styles.podiumItem}>
                <span className={styles.podiumIcon}>{RANKING_PODIUM[0].icon}</span>
                <div className={`${styles.podiumBar} ${styles.podiumBar1}`}>1</div>
                <span className={styles.podiumName}>{RANKING_PODIUM[0].department}</span>
                <span className={styles.podiumPoints}>{RANKING_PODIUM[0].points.toLocaleString('pt-BR')} pts</span>
              </div>
              {/* 3rd place */}
              <div className={styles.podiumItem}>
                <span className={styles.podiumIcon}>{RANKING_PODIUM[2].icon}</span>
                <div className={`${styles.podiumBar} ${styles.podiumBar3}`}>3</div>
                <span className={styles.podiumName}>{RANKING_PODIUM[2].department}</span>
                <span className={styles.podiumPoints}>{RANKING_PODIUM[2].points.toLocaleString('pt-BR')} pts</span>
              </div>
            </div>

            <div className={styles.rankingList}>
              {DEPARTMENTS.sort((a, b) => b.points - a.points).map((dept, i) => (
                <div key={dept.id} className={styles.rankingItem}>
                  <span className={styles.rankingPos}>{i + 1}</span>
                  <span className={styles.rankingName}>{dept.name}</span>
                  <span className={styles.rankingPoints}>{dept.points.toLocaleString('pt-BR')} pts</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeGamTab === 'Badges' && (
          <div className={styles.badgesGrid}>
            {(activeDeptChip
              ? [[activeDeptChip, DEPT_BADGES[activeDeptChip] || []]] as [string, typeof DEPT_BADGES[string]][]
              : Object.entries(DEPT_BADGES)
            ).map(([dept, badges]) => (
              <div key={dept}>
                <div className={styles.badgesDeptLabel}>{dept}</div>
                <div className={styles.badgesRow}>
                  {badges.map(b => (
                    <div
                      key={b.name}
                      className={`${styles.badgeCard} ${b.unlocked ? styles.badgeUnlocked : styles.badgeLocked}`}
                    >
                      <span className={styles.badgeIcon}>{b.icon}</span>
                      <span className={styles.badgeName}>{b.name}</span>
                      {!b.unlocked && <span className={styles.badgeLockLabel}>Bloqueado</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeGamTab === 'Progresso' && (
          <div className={styles.progressSection}>
            {(activeDeptChip
              ? [[activeDeptChip, DEPT_PROGRESS[activeDeptChip] || []]] as [string, typeof DEPT_PROGRESS[string]][]
              : Object.entries(DEPT_PROGRESS)
            ).map(([dept, items]) => (
              <div key={dept} className={styles.progressDeptBlock}>
                <div className={styles.progressDeptLabel}>{dept}</div>
                {items.map(item => (
                  <div key={item.label} className={styles.progressItem}>
                    <div className={styles.progressItemHeader}>
                      <span className={styles.progressItemLabel}>{item.label}</span>
                      <span className={styles.progressItemValue}>{item.value}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${item.value}%`,
                          background: item.value >= 85 ? '#3E7D5A' : item.value >= 70 ? '#D4B060' : '#C85C7E',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ════════════ DEPARTMENT BAR CHART ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Engajamento por Departamento</div>
        </div>
        <div className={styles.chartWrap}>
          <Bar data={deptBarData} options={barChartOptions} />
        </div>
      </div>

      {/* ════════════ CAMPAIGNS ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>Adesão às Campanhas</div>
            <div className={styles.cardSubtitle}>Performance mensal</div>
          </div>
        </div>
        <div className={styles.campaignList}>
          {CAMPAIGNS_DASHBOARD.map(campaign => (
            <div key={campaign.name} className={styles.campaignItem}>
              <div className={styles.campaignTop}>
                <div>
                  <div className={styles.campaignName}>{campaign.name}</div>
                  <div className={styles.campaignMonth}>{campaign.month}</div>
                </div>
                <span className={`${styles.campaignStatus} ${
                  campaign.status === 'done' ? styles.statusDone :
                  campaign.status === 'active' ? styles.statusActive :
                  styles.statusNext
                }`}>
                  {campaign.statusLabel}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${campaign.progress}%`, background: campaign.color }}
                />
              </div>
              <div className={styles.progressLabel}>{campaign.progress}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════ METAS POR DEPARTAMENTO ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Metas por Departamento</div>
          <button className={styles.newMetaBtn} onClick={() => setShowMetaForm(!showMetaForm)}>+ Nova Meta</button>
        </div>

        {showMetaForm && (
          <div className={styles.metaForm}>
            <input
              className={styles.metaInput}
              placeholder="Nome da meta"
              value={newMeta.goal}
              onChange={e => setNewMeta(prev => ({ ...prev, goal: e.target.value }))}
            />
            <select
              className={styles.metaInput}
              value={newMeta.dept}
              onChange={e => setNewMeta(prev => ({ ...prev, dept: e.target.value }))}
            >
              <option value="">Departamento</option>
              {DEPT_CHIPS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <input
              className={styles.metaInput}
              type="number"
              placeholder="Meta (%)"
              value={newMeta.target}
              onChange={e => setNewMeta(prev => ({ ...prev, target: e.target.value }))}
            />
            <input
              className={styles.metaInput}
              placeholder="Prazo (ex: Jun/2026)"
              value={newMeta.deadline}
              onChange={e => setNewMeta(prev => ({ ...prev, deadline: e.target.value }))}
            />
            <div className={styles.metaFormActions}>
              <button className={styles.btnFilled} onClick={handleAddMeta}>Salvar</button>
              <button className={styles.btnOutline} onClick={() => setShowMetaForm(false)}>Cancelar</button>
            </div>
          </div>
        )}

        <div className={styles.metasGrid}>
          {metas.map((meta, i) => {
            const pct = Math.round((meta.current / meta.target) * 100);
            return (
              <div key={i} className={styles.metaCard}>
                <div className={styles.metaCardHeader}>
                  <span className={styles.metaDept}>{meta.dept}</span>
                  <span className={styles.metaDeadline}>{meta.deadline}</span>
                </div>
                <div className={styles.metaGoal}>{meta.goal}</div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${pct}%`,
                      background: pct >= 90 ? '#3E7D5A' : pct >= 70 ? '#D4B060' : '#C85C7E',
                    }}
                  />
                </div>
                <div className={styles.metaFooter}>
                  <span>{meta.current}% / {meta.target}%</span>
                  <span>{pct}% concluído</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════ CONQUISTAS POR DEPARTAMENTO ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Conquistas por Departamento</div>
        </div>
        <div className={styles.conquGrid}>
          {CONQUISTAS_POR_DEPTO.map(c => (
            <div
              key={c.department}
              className={styles.conquCard}
              onClick={() => setSelectedConqDept(c.department)}
            >
              <div className={styles.conquDept}>{c.department}</div>
              <div className={styles.conquBadges}>{c.unlocked}/{c.total}</div>
              <div className={styles.conquLevel}>Nível {c.level}</div>
            </div>
          ))}
        </div>
        {selectedConqDept ? (() => {
          const badges = DEPT_BADGES[selectedConqDept] || [];
          const unlockedBadges = badges.filter(b => b.unlocked);
          const conquista = CONQUISTAS_POR_DEPTO.find(c => c.department === selectedConqDept);
          const unlockedCount = conquista?.unlocked ?? unlockedBadges.length;
          const totalCount = conquista?.total ?? badges.length;
          const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
          return (
            <div className={styles.conquDetailPanel}>
              <div className={styles.conquDetailHeader}>
                <span className={styles.conquDetailTitle}>Conquistas — {selectedConqDept}</span>
                <button
                  className={styles.conquDetailClose}
                  onClick={() => setSelectedConqDept(null)}
                >
                  Fechar
                </button>
              </div>
              <div className={styles.conquDetailProgress}>
                <div className={styles.progressItemHeader}>
                  <span className={styles.progressItemLabel}>Desbloqueadas</span>
                  <span className={styles.progressItemValue}>{unlockedCount}/{totalCount}</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${pct}%`, background: '#C85C7E' }}
                  />
                </div>
              </div>
              {badges.length > 0 && (
                <div className={styles.badgesRow}>
                  {badges.filter(b => b.unlocked).map(b => (
                    <div key={b.name} className={`${styles.badgeCard} ${styles.badgeUnlocked}`}>
                      <span className={styles.badgeIcon}>{b.icon}</span>
                      <span className={styles.badgeName}>{b.name}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className={styles.conquEncourage}>Continue para desbloquear mais!</p>
            </div>
          );
        })() : (
          <div className={styles.emptyState}>
            <p>Selecione um departamento para ver as conquistas.</p>
          </div>
        )}
      </div>

      {/* ════════════ REPORTS SECTION ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>Relatório Mensal de Conquistas</div>
          <select
            className={styles.monthSelector}
            value={reportMonth}
            onChange={e => setReportMonth(e.target.value)}
          >
            <option value="2024-12">Dezembro 2024</option>
            <option value="2024-11">Novembro 2024</option>
            <option value="2024-10">Outubro 2024</option>
          </select>
        </div>

        <div className={styles.reportStats}>
          <div className={styles.reportStat}>
            <div className={styles.reportStatValue}>{DEPARTMENTS.length}</div>
            <div className={styles.reportStatLabel}>Departamentos</div>
          </div>
          <div className={styles.reportStat}>
            <div className={styles.reportStatValue}>24</div>
            <div className={styles.reportStatLabel}>Missões</div>
          </div>
          <div className={styles.reportStat}>
            <div className={styles.reportStatValue}>156</div>
            <div className={styles.reportStatLabel}>Conquistas</div>
          </div>
          <div className={styles.reportStat}>
            <div className={styles.reportStatValue}>{totalPoints.toLocaleString('pt-BR')}</div>
            <div className={styles.reportStatLabel}>Pontos Totais</div>
          </div>
        </div>

        <div className={styles.reportActions}>
          <button className={styles.btnOutline} onClick={triggerPdf}>{pdfLabel}</button>
          <button className={styles.btnOutline} onClick={triggerHtml}>{htmlLabel}</button>
        </div>
      </div>

      {/* ════════════ CONVITES WIDGET ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardTitle} style={{ marginBottom: 16 }}>Convites</div>
        <div className={styles.conviteCounters}>
          <div className={styles.conviteCounter}>
            <div className={styles.conviteCounterValue}>{CONVITES.total}</div>
            <div className={styles.conviteCounterLabel}>Total</div>
          </div>
          <div className={styles.conviteCounter}>
            <div className={styles.conviteCounterValue}>{CONVITES.pending}</div>
            <div className={styles.conviteCounterLabel}>Pendentes</div>
          </div>
          <div className={styles.conviteCounter}>
            <div className={styles.conviteCounterValue}>{CONVITES.accepted}</div>
            <div className={styles.conviteCounterLabel}>Aceitos</div>
          </div>
          <div className={styles.conviteCounter}>
            <div className={styles.conviteCounterValue}>{CONVITES.expired}</div>
            <div className={styles.conviteCounterLabel}>Expirados</div>
          </div>
        </div>
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            placeholder="Buscar convite..."
            value={conviteSearch}
            onChange={e => setConviteSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={conviteFilter}
            onChange={e => setConviteFilter(e.target.value)}
          >
            <option>Todos</option>
            <option>Pendentes</option>
            <option>Aceitos</option>
            <option>Expirados</option>
          </select>
        </div>
      </div>

      {/* ════════════ RELATÓRIOS AUTOMÁTICOS ════════════ */}
      <div className={styles.card}>
        <div className={styles.cardTitle} style={{ marginBottom: 16 }}>Relatórios Automáticos</div>
        <div className={styles.autoReportList}>
          {REPORTS.map(report => (
            <div key={report.type} className={styles.autoReportItem}>
              <div className={styles.autoReportInfo}>
                <div className={styles.autoReportTitle}>{report.label}</div>
                <div className={styles.autoReportDesc}>{report.description}</div>
                <div className={styles.autoReportSchedule}>{report.schedule} &middot; {report.recipientEmail}</div>
              </div>
              <div className={styles.autoReportRight}>
                <button
                  className={`${styles.toggle} ${reportToggles[report.type] ? styles.toggleActive : ''}`}
                  onClick={() => setReportToggles(prev => ({ ...prev, [report.type]: !prev[report.type] }))}
                  aria-label={`Toggle ${report.label}`}
                />
                <button
                  className={styles.btnOutline}
                  onClick={() => triggerEnviar(report.type)}
                >
                  {enviarLabels[report.type]}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
