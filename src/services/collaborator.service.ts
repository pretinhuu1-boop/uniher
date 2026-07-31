import { getReadDb } from '@/lib/db';
import * as userRepo from '@/repositories/user.repository';
import * as badgeRepo from '@/repositories/badge.repository';
import * as challengeRepo from '@/repositories/challenge.repository';
import * as campaignRepo from '@/repositories/campaign.repository';
import * as notifRepo from '@/repositories/notification.repository';

const RETIRED_BADGE_IDS = new Set(['badge_equilibrio']);

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
      FROM user_exams
      WHERE user_id = ? AND COALESCE(not_applicable, 0) = 0
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
  const badges = badgeRepo.getUserBadges(userId).filter((badge) => !RETIRED_BADGE_IDS.has(badge.id));
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

export function getCollaboratorBadges(userId: string) {
  return badgeRepo.getUserBadges(userId)
    .filter((badge) => !RETIRED_BADGE_IDS.has(badge.id))
    .map(b => ({
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
