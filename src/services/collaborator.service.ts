import { getReadDb } from '@/lib/db';
import { SEMAFORO_REVIEW_STATE } from '@/lib/semaforo/containment';
import * as campaignRepo from '@/repositories/campaign.repository';
import * as notifRepo from '@/repositories/notification.repository';

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
  const user = getReadDb().prepare('SELECT name FROM users WHERE id = ?').get(userId) as
    | { name: string }
    | undefined;
  if (!user) throw new Error('Usuário não encontrado');

  const activeCampaigns = campaignRepo.countActiveCampaigns(companyId);
  const unreadNotifs = notifRepo.countUnread(userId);
  const examStats = getExamsPercent(userId);

  return {
    greeting: getCurrentGreeting(),
    userName: user.name.split(' ')[0],
    date: getFormattedDate(),
    examsPercent: examStats.percent,
    examsTotal: examStats.total,
    contentViewed: 12,
    campaignsActive: activeCampaigns,
    campaignsTotal: 4,
    unreadNotifications: unreadNotifs,
  };
}

export function getCollaboratorSemaforo() {
  return SEMAFORO_REVIEW_STATE;
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
