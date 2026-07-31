import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import { getWriteQueue } from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import * as userRepo from '@/repositories/user.repository';
import * as activityRepo from '@/repositories/activity-log.repository';
import * as badgeRepo from '@/repositories/badge.repository';
import * as notifRepo from '@/repositories/notification.repository';
import { getLevelFromPoints, getWeekStart } from '@/services/gamification.service';

export interface ActivityResult {
  pointsEarned: number;
  newStreak?: number;
  badgeUnlocked?: string;
  levelUp?: boolean;
}

export async function recordActivity(userId: string, data: {
  action: string;
  targetType?: string;
  targetId?: string;
  points?: number;
}): Promise<ActivityResult> {
  const user = userRepo.getUserById(userId);
  if (!user) throw new Error('Usuário não encontrado');

  const pointsToAdd = data.points || 0;
  let newStreak = user.streak;
  let badgeUnlocked: string | undefined;
  let levelUp = false;

  // 1. Atualizar Pontos & Level (Lógica de subir de nível simplificada: a cada 5000 pts?)
  // No CollaboratorService usamos Level = accum + level * 500.
  // Vamos apenas adicionar os pontos por enquanto.
  const oldPoints = user.points;
  const newPoints = oldPoints + pointsToAdd;
  
  // 2. Lógica de Streak (se for atividade do dia)
  // Só incrementamos se for uma 'ação real' (não apenas login)
  if (data.action !== 'login' && data.action !== 'logout') {
    const todayStr = new Date().toISOString().split('T')[0];
    const lastActivity = activityRepo.getLatestActivityDate(userId);
    
    if (!lastActivity) {
      newStreak = 1;
    } else {
      const last = new Date(lastActivity);
      const today = new Date(todayStr);
      const diffTime = today.getTime() - last.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1; // Sequência mantida
      } else if (diffDays > 1) {
        newStreak = 1; // Sequência perdida
      }
      // Se diffDays === 0 (hoje), mantém o streak atual.
    }
  }

  // 3. Persistir Log
  await activityRepo.createActivity({
    userId,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    pointsEarned: pointsToAdd,
  });

  // 4. Atualizar Usuário no Banco
  await userRepo.updateUser(userId, {
    points: newPoints,
    streak: newStreak,
    lastActive: new Date().toISOString()
  });

  // 5. Verificar Badges (Exemplos)
  // Badge de Streak de 7 dias
  if (newStreak === 7) {
    const hasBadge = badgeRepo.getUserBadges(userId).find(b => b.id === 'badge_2' && b.unlocked);
    if (!hasBadge) {
      await badgeRepo.unlockBadge(userId, 'badge_2');
      badgeUnlocked = 'Badge de Streak de 7 dias!';
      await notifRepo.createNotification({
        userId,
        type: 'badge',
        title: 'Sequência de 7 dias! 🔥',
        message: 'Você acaba de desbloquear o badge de assiduidade de uma semana!'
      });
    }
  }

  // 6. Verificar Notificações de Nível (se cruzar a barreira de level)
  if (Math.floor(newPoints / 1000) > Math.floor(oldPoints / 1000)) {
    levelUp = true;
    await notifRepo.createNotification({
      userId,
      type: 'level',
      title: 'Subiu de Nível! 📈',
      message: `Parabéns! Você alcançou novos horizontes na sua jornada de saúde.`
    });
  }

  return {
    pointsEarned: pointsToAdd,
    newStreak,
    badgeUnlocked,
    levelUp
  };
}

interface ChallengeProgressOptions {
  companyId?: string;
  progressPoints?: number;
  creditMode?: 'activity' | 'gamification';
}

export interface ChallengeProgressResult extends ActivityResult {
  id: string;
  progress: number;
  total: number;
  status: string;
  completedAt: string | null;
}

interface ActiveChallengeActor {
  company_id: string;
  points: number;
  level: number;
  streak: number;
  last_active: string | null;
  daily_xp_earned: number;
  daily_xp_date: string | null;
  league: string;
}

interface ChallengeProgressRow {
  id: string;
  points: number;
  total_steps: number;
  progress: number;
  status: string;
  completed_at: string | null;
}

function getActiveChallengeActor(
  db: Database.Database,
  userId: string,
  expectedCompanyId?: string,
): ActiveChallengeActor | undefined {
  return db.prepare(`
    SELECT
      u.company_id, u.points, u.level, u.streak, u.last_active,
      u.daily_xp_earned, u.daily_xp_date, u.league
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
      AND (? IS NULL OR u.company_id = ?)
      AND u.role IN ('colaboradora', 'lideranca', 'rh', 'admin')
      AND u.approved = 1
      AND u.blocked = 0
      AND u.deleted_at IS NULL
      AND c.is_active = 1
      AND c.deleted_at IS NULL
  `).get(userId, expectedCompanyId ?? null, expectedCompanyId ?? null) as
    | ActiveChallengeActor
    | undefined;
}

function getOwnedChallenge(
  db: Database.Database,
  userId: string,
  companyId: string,
  challengeId: string,
): ChallengeProgressRow | undefined {
  return db.prepare(`
    SELECT
      c.id, c.points, c.total_steps,
      uc.progress, uc.status, uc.completed_at
    FROM user_challenges uc
    JOIN challenges c ON c.id = uc.challenge_id
    WHERE uc.user_id = ?
      AND uc.challenge_id = ?
      AND c.is_active = 1
      AND (c.company_id IS NULL OR c.company_id = ?)
  `).get(userId, challengeId, companyId) as ChallengeProgressRow | undefined;
}

function applyGamificationCredit(
  db: Database.Database,
  actor: ActiveChallengeActor,
  userId: string,
  challengeId: string,
  points: number,
): void {
  const newPoints = actor.points + points;
  const { level } = getLevelFromPoints(newPoints);
  const today = new Date().toISOString().split('T')[0];
  const dailyEarned = actor.daily_xp_date === today ? actor.daily_xp_earned : 0;

  db.prepare(`
    UPDATE users
    SET points = ?, level = ?, daily_xp_earned = ?, daily_xp_date = ?,
        updated_at = datetime('now')
    WHERE id = ? AND company_id = ?
  `).run(newPoints, level, dailyEarned + points, today, userId, actor.company_id);

  const weekStart = getWeekStart();
  const league = db.prepare(`
    SELECT id
    FROM user_leagues
    WHERE user_id = ? AND week_start = ?
  `).get(userId, weekStart) as { id: string } | undefined;
  if (league) {
    db.prepare(`
      UPDATE user_leagues
      SET week_points = week_points + ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(points, league.id, userId);
  } else {
    db.prepare(`
      INSERT INTO user_leagues (id, user_id, league, week_points, week_start)
      VALUES (?, ?, ?, ?, ?)
    `).run(nanoid(), userId, actor.league || 'bronze', points, weekStart);
  }

  db.prepare(`
    INSERT INTO activity_log (
      id, user_id, action, target_type, target_id, points_earned
    ) VALUES (?, ?, 'earn_points_challenge', 'challenge', ?, ?)
  `).run(nanoid(), userId, challengeId, points);
}

function applyActivityCredit(
  db: Database.Database,
  actor: ActiveChallengeActor,
  userId: string,
  challengeId: string,
  points: number,
  completed: boolean,
): number {
  const today = new Date().toISOString().split('T')[0];
  let newStreak = actor.streak;
  const latest = db.prepare(`
    SELECT date(created_at) AS date
    FROM activity_log
    WHERE user_id = ? AND action != 'login'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId) as { date: string } | undefined;

  if (!latest) {
    newStreak = 1;
  } else {
    const diffDays = Math.ceil(
      (new Date(today).getTime() - new Date(latest.date).getTime()) / 86_400_000,
    );
    if (diffDays === 1) newStreak += 1;
    if (diffDays > 1) newStreak = 1;
  }

  db.prepare(`
    INSERT INTO activity_log (
      id, user_id, action, target_type, target_id, points_earned
    ) VALUES (?, ?, ?, 'challenge', ?, ?)
  `).run(
    nanoid(),
    userId,
    completed ? 'challenge_complete' : 'challenge_progress',
    challengeId,
    points,
  );
  db.prepare(`
    UPDATE users
    SET points = points + ?, streak = ?, last_active = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ? AND company_id = ?
  `).run(points, newStreak, userId, actor.company_id);

  return newStreak;
}

export async function updateChallengeProgress(
  userId: string,
  challengeId: string,
  increment = 1,
  options: ChallengeProgressOptions = {},
): Promise<ChallengeProgressResult> {
  if (!Number.isInteger(increment) || increment < 1) {
    throw new ValidationError('Incremento de desafio invalido');
  }

  const writeQueue = getWriteQueue();
  return writeQueue.enqueue((db) => {
    const advance = db.transaction((): ChallengeProgressResult => {
      const actor = getActiveChallengeActor(db, userId, options.companyId);
      if (!actor) {
        throw new ConflictError('Autorizacao da colaboradora expirou');
      }

      const challenge = getOwnedChallenge(db, userId, actor.company_id, challengeId);
      if (!challenge) {
        throw new NotFoundError('Desafio nao encontrado');
      }
      if (challenge.status !== 'active') {
        return {
          pointsEarned: 0,
          newStreak: actor.streak,
          id: challenge.id,
          progress: Math.min(challenge.progress, challenge.total_steps),
          total: challenge.total_steps,
          status: challenge.status,
          completedAt: challenge.completed_at,
        };
      }

      const newProgress = Math.min(
        challenge.progress + increment,
        challenge.total_steps,
      );
      const completed = newProgress >= challenge.total_steps;
      const completedAt = completed ? new Date().toISOString() : null;
      const updated = db.prepare(`
        UPDATE user_challenges
        SET progress = ?, status = ?, completed_at = ?
        WHERE user_id = ?
          AND challenge_id = ?
          AND status = 'active'
          AND progress = ?
      `).run(
        newProgress,
        completed ? 'completed' : 'active',
        completedAt,
        userId,
        challengeId,
        challenge.progress,
      );
      if (updated.changes !== 1) {
        throw new ConflictError('Progresso do desafio foi alterado');
      }

      const pointsEarned = completed
        ? challenge.points
        : (options.progressPoints ?? 10);
      let newStreak = actor.streak;
      if (pointsEarned > 0) {
        if (options.creditMode === 'gamification') {
          applyGamificationCredit(db, actor, userId, challengeId, pointsEarned);
        } else {
          newStreak = applyActivityCredit(
            db,
            actor,
            userId,
            challengeId,
            pointsEarned,
            completed,
          );
        }
      }

      return {
        pointsEarned,
        newStreak,
        id: challenge.id,
        progress: newProgress,
        total: challenge.total_steps,
        status: completed ? 'completed' : 'active',
        completedAt,
      };
    });

    return advance.immediate();
  }, 'advance collaborator challenge', { retryOnFailure: false });
}
