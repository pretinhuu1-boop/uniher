import { getReadDb } from '@/lib/db';
import * as userRepo from '@/repositories/user.repository';
import * as badgeRepo from '@/repositories/badge.repository';
import * as challengeRepo from '@/repositories/challenge.repository';
import * as campaignRepo from '@/repositories/campaign.repository';
import * as healthRepo from '@/repositories/health-score.repository';
import * as notifRepo from '@/repositories/notification.repository';

function getLevelFromPoints(points: number): { level: number; pointsToNext: number } {
  let level = 1;
  let accumulated = 0;
  while (accumulated + level * 500 <= points) {
    accumulated += level * 500;
    level++;
  }
  const pointsToNext = level * 500 - (points - accumulated);
  return { level, pointsToNext };
}

function getCurrentGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

function getExamsPercent(userId: string): { percent: number; total: number } {
  try {
    const db = getReadDb();
    const row = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM user_exams WHERE user_id = ?
    `).get(userId) as { total: number; completed: number } | undefined;

    if (!row || row.total === 0) return { percent: 0, total: 0 };
    return { percent: Math.round((row.completed / row.total) * 100), total: row.total };
  } catch {
    return { percent: 0, total: 0 };
  }
}

export function getCollaboratorHome(userId: string, companyId: string) {
  const user = userRepo.getUserById(userId);
  if (!user) throw new Error('Usuário não encontrado');

  const { level, pointsToNext } = getLevelFromPoints(user.points);
  const badges = badgeRepo.getUserBadges(userId);
  const unlockedBadges = badges.filter(b => b.unlocked);
  const challenges = challengeRepo.getUserChallenges(userId, 'active');
  const activeCampaigns = campaignRepo.countActiveCampaigns(companyId);
  const unreadNotifs = notifRepo.countUnread(userId);
  const examStats = getExamsPercent(userId);

  return {
    greeting: getCurrentGreeting(),
    userName: user.name.split(' ')[0],
    date: getFormattedDate(),
    healthAlert: user.streak > 0
      ? `Você está em sequência de ${user.streak} dias!`
      : 'Complete um desafio hoje para iniciar sua sequência',
    examsPercent: examStats.percent,
    examsTotal: examStats.total,
    contentViewed: 12,
    campaignsActive: activeCampaigns,
    campaignsTotal: 4,
    streakDays: user.streak,
    level,
    points: user.points,
    pointsNextLevel: pointsToNext,
    achievementCount: unlockedBadges.length,
    engagementStats: {
      streakDays: user.streak,
      openRate: 87,
      actionsToday: challenges.filter(c => c.progress > 0).length,
    },
    unreadNotifications: unreadNotifs,
  };
}

export function getCollaboratorSemaforo(userId: string) {
  const scores = healthRepo.getLatestHealthScores(userId);

  const RECOMMENDATIONS: Record<string, string[]> = {
    'Prevenção': [
      'Agende sua mamografia anual',
      'Faça o Papanicolau em dia',
      'Consulte seu ginecologista',
    ],
    'Sono': [
      'Mantenha horários regulares de sono',
      'Evite telas 1h antes de dormir',
      'Pratique respiração profunda',
    ],
    'Energia': [
      'Hidrate-se: 8 copos de água/dia',
      'Faça pausas ativas de 5 min',
      'Inclua proteínas no café da manhã',
    ],
    'Saúde Mental': [
      'Pratique mindfulness por 10 min',
      'Converse com alguém de confiança',
      'Limite o tempo nas redes sociais',
    ],
    'Hábitos': [
      'Inclua vegetais em todas as refeições',
      'Faça 30 min de atividade física',
      'Reduza o açúcar processado',
    ],
    'Engajamento': [
      'Complete um desafio hoje',
      'Participe da campanha ativa',
      'Compartilhe uma conquista',
    ],
  };

  return scores.map(s => ({
    dimension: s.dimension,
    status: s.status,
    score: s.score,
    recommendation: (RECOMMENDATIONS[s.dimension] || ['Mantenha seus hábitos saudáveis'])[0],
    icon: s.icon,
    history: healthRepo.getHealthScoreHistory(userId, s.dimension, 30).map(h => h.score),
    tips: RECOMMENDATIONS[s.dimension] || [],
  }));
}

export function getCollaboratorBadges(userId: string) {
  return badgeRepo.getUserBadges(userId).map(b => ({
    id: b.id,
    name: b.name,
    description: b.description,
    icon: b.icon,
    points: b.points,
    rarity: b.rarity,
    unlockedAt: b.unlocked_at,
    unlocked: Boolean(b.unlocked),
  }));
}

export function getCollaboratorChallenges(userId: string) {
  const all = challengeRepo.getUserChallenges(userId);
  return all.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    progress: c.progress,
    total: c.total_steps,
    points: c.points,
    deadline: c.deadline,
    status: c.status,
    category: c.category,
  }));
}

export function getCollaboratorCampaigns(userId: string, companyId: string) {
  return campaignRepo.getUserCampaigns(userId, companyId).map(c => ({
    id: c.id,
    name: c.name,
    month: c.month,
    color: c.color,
    status: c.status,
    statusLabel: c.status_label,
    progress: c.progress,
    joined: Boolean(c.joined),
  }));
}

export function getCollaboratorNotifications(userId: string) {
  return notifRepo.getUserNotifications(userId).map(n => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp: n.created_at,
    read: Boolean(n.read),
  }));
}
