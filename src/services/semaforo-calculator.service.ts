/**
 * Semáforo Híbrido — calcula scores com dados objetivos + auto-avaliação.
 *
 * Dimensões objetivas (dados reais do sistema):
 *   - Engajamento: check-ins, desafios, missões
 *   - Hábitos: streak, consistência, missões concluídas
 *   - Prevenção: exames em dia
 *
 * Dimensões subjetivas (quiz + ajuste por atividade):
 *   - Sono, Energia, Saúde Mental: base do quiz, ajustadas pela atividade geral
 */

import { getReadDb } from '@/lib/db';
import * as healthRepo from '@/repositories/health-score.repository';

interface ObjectiveData {
  streak: number;
  totalCheckIns7d: number;
  completedChallenges: number;
  activeChallenges: number;
  missionsCompleted7d: number;
  examsOnTime: number;
  totalExams: number;
  level: number;
  points: number;
}

function getObjectiveData(userId: string): ObjectiveData {
  const db = getReadDb();

  // User stats
  const user = db.prepare('SELECT streak, level, points FROM users WHERE id = ?').get(userId) as any || { streak: 0, level: 1, points: 0 };

  // Check-ins last 7 days
  const checkIns = db.prepare(`
    SELECT COUNT(*) as c FROM activity_log
    WHERE user_id = ? AND action = 'check_in'
    AND created_at >= datetime('now', '-7 days')
  `).get(userId) as any;

  // Completed challenges
  const challenges = db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active
    FROM user_challenges WHERE user_id = ?
  `).get(userId) as any;

  // Missions completed last 7 days
  let missionsCompleted7d = 0;
  try {
    const missions = db.prepare(`
      SELECT COUNT(*) as c FROM mission_logs
      WHERE user_id = ? AND completed_at >= datetime('now', '-7 days')
    `).get(userId) as any;
    missionsCompleted7d = missions?.c || 0;
  } catch { /* table may not exist */ }

  // Exams on time
  let examsOnTime = 0;
  let totalExams = 0;
  try {
    const exams = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as on_time
      FROM user_exams WHERE user_id = ?
    `).get(userId) as any;
    examsOnTime = exams?.on_time || 0;
    totalExams = exams?.total || 0;
  } catch { /* table may not exist */ }

  return {
    streak: user.streak || 0,
    totalCheckIns7d: checkIns?.c || 0,
    completedChallenges: challenges?.completed || 0,
    activeChallenges: challenges?.active || 0,
    missionsCompleted7d,
    examsOnTime,
    totalExams,
    level: user.level || 1,
    points: user.points || 0,
  };
}

function clamp(v: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, Math.round(v * 10) / 10));
}

/**
 * Calcula score de Engajamento (100% objetivo)
 * - Check-ins na semana (0-7) → peso 40%
 * - Desafios ativos/completos → peso 30%
 * - Missões concluídas na semana → peso 30%
 */
function calcEngajamento(data: ObjectiveData): number {
  const checkInScore = (data.totalCheckIns7d / 7) * 10; // 7/7 = 10
  const challengeScore = Math.min(10, (data.completedChallenges * 2) + (data.activeChallenges * 0.5));
  const missionScore = Math.min(10, (data.missionsCompleted7d / 3) * 10); // 3 missions/week = 10

  return clamp(checkInScore * 0.4 + challengeScore * 0.3 + missionScore * 0.3);
}

/**
 * Calcula score de Hábitos (100% objetivo)
 * - Streak atual → peso 50%
 * - Missões concluídas → peso 30%
 * - Level/consistência → peso 20%
 */
function calcHabitos(data: ObjectiveData): number {
  const streakScore = Math.min(10, data.streak / 3); // 30 dias = 10
  const missionScore = Math.min(10, (data.missionsCompleted7d / 3) * 10);
  const levelScore = Math.min(10, data.level * 1.5);

  return clamp(streakScore * 0.5 + missionScore * 0.3 + levelScore * 0.2);
}

/**
 * Calcula score de Prevenção (objetivo)
 * - Exames em dia / total exames esperados
 * - Se nenhum exame registrado, base 5 (neutro)
 */
function calcPrevencao(data: ObjectiveData): number {
  if (data.totalExams === 0) return 5; // Neutro se não há exames cadastrados
  return clamp((data.examsOnTime / Math.max(1, data.totalExams)) * 10);
}

/**
 * Ajusta score subjetivo (quiz) pela atividade geral.
 * Se a pessoa usa o app ativamente, ganha até +1.5 no score do quiz.
 * Se não usa, perde até -1.5.
 */
function adjustSubjective(quizScore: number, data: ObjectiveData): number {
  // Activity index: 0 (inativa) to 1 (muito ativa)
  const activityIndex = Math.min(1, (
    (data.totalCheckIns7d / 7) * 0.4 +
    (Math.min(1, data.streak / 14)) * 0.3 +
    (Math.min(1, data.missionsCompleted7d / 3)) * 0.3
  ));

  // Adjustment: -1.5 (inactive) to +1.5 (very active)
  const adjustment = (activityIndex - 0.5) * 3;

  return clamp(quizScore + adjustment);
}

/**
 * Recalcula todos os scores do semáforo para um usuário.
 * Combina dados objetivos + auto-avaliação do quiz.
 */
export async function recalculateSemaforo(userId: string): Promise<void> {
  const data = getObjectiveData(userId);

  // Get latest quiz-based scores (subjetivos)
  const currentScores = healthRepo.getLatestHealthScores(userId);
  const scoreMap: Record<string, number> = {};
  currentScores.forEach(s => { scoreMap[s.dimension] = s.score; });

  // Calculate objective dimensions
  const engajamento = calcEngajamento(data);
  const habitos = calcHabitos(data);
  const prevencao = calcPrevencao(data);

  // Adjust subjective dimensions
  const sono = adjustSubjective(scoreMap['Sono'] || 5, data);
  const energia = adjustSubjective(scoreMap['Energia'] || 5, data);
  const saudeMental = adjustSubjective(scoreMap['Saúde Mental'] || 5, data);

  // Record new scores
  await healthRepo.recordHealthScore(userId, 'Engajamento', engajamento);
  await healthRepo.recordHealthScore(userId, 'Hábitos', habitos);
  await healthRepo.recordHealthScore(userId, 'Prevenção', prevencao);
  await healthRepo.recordHealthScore(userId, 'Sono', sono);
  await healthRepo.recordHealthScore(userId, 'Energia', energia);
  await healthRepo.recordHealthScore(userId, 'Saúde Mental', saudeMental);
}

/**
 * Recalcula semáforo para todos os usuários ativos de uma empresa.
 */
export async function recalculateCompanySemaforo(companyId: string): Promise<number> {
  const db = getReadDb();
  const users = db.prepare(`
    SELECT id FROM users
    WHERE company_id = ? AND deleted_at IS NULL AND blocked = 0
    AND role IN ('colaboradora', 'lideranca')
  `).all(companyId) as { id: string }[];

  for (const u of users) {
    await recalculateSemaforo(u.id);
  }

  return users.length;
}

/**
 * Recalcula semáforo para TODOS os usuários ativos do sistema.
 */
export async function recalculateAllSemaforos(): Promise<number> {
  const db = getReadDb();
  const users = db.prepare(`
    SELECT id FROM users
    WHERE deleted_at IS NULL AND blocked = 0
    AND role IN ('colaboradora', 'lideranca')
  `).all() as { id: string }[];

  for (const u of users) {
    await recalculateSemaforo(u.id);
  }

  return users.length;
}
