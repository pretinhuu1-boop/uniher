import * as userRepo from '@/repositories/user.repository';
import * as activityRepo from '@/repositories/activity-log.repository';
import * as badgeRepo from '@/repositories/badge.repository';
import * as notifRepo from '@/repositories/notification.repository';
import * as challengeRepo from '@/repositories/challenge.repository';

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

export async function updateChallengeProgress(userId: string, challengeId: string, increment = 1): Promise<ActivityResult> {
  const userChallenge = challengeRepo.getUserChallenge(userId, challengeId);
  if (!userChallenge) throw new Error('Desafio não encontrado');
  if (userChallenge.status === 'completed') return { pointsEarned: 0 };

  const newProgress = Math.min(userChallenge.progress + increment, userChallenge.total_steps);
  const isCompleted = newProgress === userChallenge.total_steps;
  
  await challengeRepo.updateUserChallenge(userId, challengeId, {
    progress: newProgress,
    status: isCompleted ? 'completed' : 'active',
    completedAt: isCompleted ? new Date().toISOString() : undefined
  });

  // Lógica de Atividade ao progredir
  return recordActivity(userId, {
    action: isCompleted ? 'challenge_complete' : 'challenge_progress',
    targetType: 'challenge',
    targetId: challengeId,
    points: isCompleted ? userChallenge.points : 10 // Da uns quebrados por passo para motivar
  });
}
