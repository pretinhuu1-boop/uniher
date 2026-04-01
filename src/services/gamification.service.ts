import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export function getLevelFromPoints(points: number): { level: number; currentXP: number; nextLevelXP: number } {
  let level = 1;
  let accumulated = 0;
  const xpPerLevel = (lvl: number) => lvl * 500;
  while (accumulated + xpPerLevel(level) <= points) {
    accumulated += xpPerLevel(level);
    level++;
  }
  return { level, currentXP: points - accumulated, nextLevelXP: xpPerLevel(level) };
}

export async function addPoints(
  userId: string,
  points: number,
  source: string,
  sourceId?: string
): Promise<{ newPoints: number; leveledUp: boolean; newLevel: number }> {
  const writeQueue = getWriteQueue();
  return writeQueue.enqueue(async (db) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) throw new Error('Usuário não encontrado');

    const oldLevel = getLevelFromPoints(user.points).level;
    const newPoints = user.points + points;
    const { level: newLevel } = getLevelFromPoints(newPoints);
    const leveledUp = newLevel > oldLevel;

    // Update points + daily XP
    const today = new Date().toISOString().split('T')[0];
    const dailyEarned = user.daily_xp_date === today ? (user.daily_xp_earned || 0) : 0;

    db.prepare(`UPDATE users SET points = ?, level = ?, daily_xp_earned = ?, daily_xp_date = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(newPoints, newLevel, dailyEarned + points, today, userId);

    // Update league week points
    const weekStart = getWeekStart();
    const existingLeague = db.prepare('SELECT * FROM user_leagues WHERE user_id = ? AND week_start = ?').get(userId, weekStart) as any;
    if (existingLeague) {
      db.prepare(`UPDATE user_leagues SET week_points = week_points + ?, updated_at = datetime('now') WHERE id = ?`).run(points, existingLeague.id);
    } else {
      db.prepare('INSERT INTO user_leagues (id, user_id, league, week_points, week_start) VALUES (?, ?, ?, ?, ?)')
        .run(nanoid(), userId, user.league || 'bronze', points, weekStart);
    }

    db.prepare(`INSERT INTO activity_log (id, user_id, action, target_type, target_id, points_earned) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(nanoid(), userId, `earn_points_${source}`, source, sourceId || null, points);

    return { newPoints, leveledUp, newLevel };
  });
}

export async function dailyCheckIn(userId: string): Promise<{
  xpEarned: number; newPoints: number; newLevel: number; leveledUp: boolean;
  newStreak: number; streakMilestone: number | null; dailyGoalReached: boolean;
  badgesUnlocked: string[]; alreadyDone: boolean;
}> {
  const writeQueue = getWriteQueue();

  type CheckInResult = { alreadyDone: true } | { xpEarned: number; newPoints: number; newLevel: number; leveledUp: boolean; newStreak: number; streakMilestone: number | null; dailyGoalReached: boolean; alreadyDone: false };
  const result = await writeQueue.enqueue((db): CheckInResult => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) throw new Error('User not found');

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Already checked in today?
    // Use substring(0, 10) to handle both ISO format ("2026-04-01T...") and
    // SQLite datetime('now') format ("2026-04-01 ...") where split('T') would fail.
    const lastActive = user.last_active ? user.last_active.substring(0, 10) : null;
    if (lastActive === today) return { alreadyDone: true };

    // Streak logic
    let newStreak: number;
    if (lastActive === yesterday) {
      newStreak = (user.streak || 0) + 1;
    } else {
      // Check streak freeze
      const freeze = db.prepare('SELECT * FROM streak_freezes WHERE user_id = ?').get(userId) as any;
      if (freeze && freeze.quantity > 0 && user.streak > 0) {
        newStreak = (user.streak || 0) + 1;
        db.prepare(`UPDATE streak_freezes SET quantity = quantity - 1, updated_at = datetime('now') WHERE user_id = ?`).run(userId);
      } else {
        newStreak = 1;
      }
    }

    const streakMilestone = [7, 14, 30, 60, 100].includes(newStreak) ? newStreak : null;
    const xpEarned = 50;
    const oldLevel = getLevelFromPoints(user.points).level;
    const newPoints = user.points + xpEarned;
    const { level: newLevel } = getLevelFromPoints(newPoints);
    const leveledUp = newLevel > oldLevel;

    const dailyEarned = user.daily_xp_date === today ? (user.daily_xp_earned || 0) : 0;
    const newDailyEarned = dailyEarned + xpEarned;
    const dailyGoal = user.daily_xp_goal || 20;
    const dailyGoalReached = dailyEarned < dailyGoal && newDailyEarned >= dailyGoal;

    db.prepare(`UPDATE users SET points = ?, level = ?, streak = ?, last_active = datetime('now'),
      daily_xp_earned = ?, daily_xp_date = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(newPoints, newLevel, newStreak, newDailyEarned, today, userId);

    // League update
    const weekStart = getWeekStart();
    const existingLeague = db.prepare('SELECT * FROM user_leagues WHERE user_id = ? AND week_start = ?').get(userId, weekStart) as any;
    if (existingLeague) {
      db.prepare(`UPDATE user_leagues SET week_points = week_points + ?, updated_at = datetime('now') WHERE id = ?`).run(xpEarned, existingLeague.id);
    } else {
      db.prepare('INSERT INTO user_leagues (id, user_id, league, week_points, week_start) VALUES (?, ?, ?, ?, ?)')
        .run(nanoid(), userId, user.league || 'bronze', xpEarned, weekStart);
    }

    db.prepare(`INSERT INTO activity_log (id, user_id, action, target_type, points_earned) VALUES (?, ?, 'check_in', 'daily', ?)`)
      .run(nanoid(), userId, xpEarned);

    // Streak milestone notification
    if (streakMilestone) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'badge', ?, ?)`)
        .run(nanoid(), userId, `🔥 ${streakMilestone} dias de sequência!`, `Incrível! Você manteve ${streakMilestone} dias consecutivos.`);
    }

    if (leveledUp) {
      db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'level', ?, ?)`)
        .run(nanoid(), userId, `🎉 Subiu para Nível ${newLevel}!`, `Parabéns! Você alcançou o nível ${newLevel}.`);
    }

    return { xpEarned, newPoints, newLevel, leveledUp, newStreak, streakMilestone, dailyGoalReached, alreadyDone: false };
  });

  if (result.alreadyDone) {
    const db = getReadDb();
    const user = db.prepare('SELECT points, level, streak, daily_xp_earned, daily_xp_goal FROM users WHERE id = ?').get(userId) as any;
    return { xpEarned: 0, newPoints: user.points, newLevel: user.level, leveledUp: false, newStreak: user.streak, streakMilestone: null, dailyGoalReached: false, badgesUnlocked: [], alreadyDone: true };
  }

  // Check badge unlocks
  const badgesUnlocked = await checkAndUnlockBadges(userId);

  // Recalculate semaforo with objective data
  try {
    const { recalculateSemaforo } = await import('./semaforo-calculator.service');
    await recalculateSemaforo(userId);
  } catch { /* non-critical */ }

  return { ...result, badgesUnlocked };
}

export async function updateStreak(userId: string): Promise<number> {
  return (await dailyCheckIn(userId)).newStreak;
}

export async function checkAndUnlockBadges(userId: string): Promise<string[]> {
  const db = getReadDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return [];

  const completedChallenges = (db.prepare(
    "SELECT COUNT(*) as count FROM user_challenges WHERE user_id = ? AND status = 'completed'"
  ).get(userId) as { count: number }).count;

  const unlockedIds = new Set(
    (db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId) as any[]).map(r => r.badge_id)
  );

  const examsOnTime = (db.prepare(
    "SELECT COUNT(*) as count FROM user_exams WHERE user_id = ? AND status = 'done'"
  ).get(userId) as { count: number } | undefined)?.count ?? 0;

  // Check all 6 health dimensions > 7
  const healthScores = db.prepare('SELECT score FROM health_scores WHERE user_id = ?').all(userId) as any[];
  const allDimensionsHigh = healthScores.length >= 6 && healthScores.every(h => h.score >= 7.0);

  const CONDITIONS: { id: string; check: boolean }[] = [
    { id: 'badge_iniciante', check: user.streak >= 1 || completedChallenges >= 1 },
    { id: 'badge_streak7', check: user.streak >= 7 },
    { id: 'badge_preventiva', check: examsOnTime >= 3 },
    { id: 'badge_streak30', check: user.streak >= 30 },
    { id: 'badge_mestra', check: getLevelFromPoints(user.points).level >= 10 },
    { id: 'badge_maratonista', check: completedChallenges >= 50 },
    { id: 'badge_equilibrio', check: allDimensionsHigh },
  ];

  const writeQueue = getWriteQueue();
  const newlyUnlocked: string[] = [];

  for (const { id, check } of CONDITIONS) {
    if (check && !unlockedIds.has(id)) {
      await writeQueue.enqueue((db) => {
        const badge = db.prepare('SELECT * FROM badges WHERE id = ?').get(id) as any;
        if (!badge) return;

        // Insert user_badge
        try {
          db.prepare('INSERT INTO user_badges (user_id, badge_id, unlocked_at) VALUES (?, ?, datetime(\'now\'))').run(userId, id);
        } catch { return; }

        // Award badge points
        const newPoints = user.points + badge.points;
        const { level } = getLevelFromPoints(newPoints);
        db.prepare(`UPDATE users SET points = ?, level = ?, updated_at = datetime('now') WHERE id = ?`).run(newPoints, level, userId);

        // Notification
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'badge', ?, ?)`)
          .run(nanoid(), userId, `${badge.icon} Badge Desbloqueado!`, `Você conquistou "${badge.name}" — +${badge.points} pts`);
      });
      newlyUnlocked.push(id);
    }
  }

  return newlyUnlocked;
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

export function getStreakStatus(userId: string) {
  const db = getReadDb();
  const user = db.prepare('SELECT streak, last_active, daily_xp_earned, daily_xp_goal, daily_xp_date, points, level FROM users WHERE id = ?').get(userId) as any;
  const freeze = db.prepare('SELECT quantity FROM streak_freezes WHERE user_id = ?').get(userId) as any;
  const today = new Date().toISOString().split('T')[0];
  const checkedInToday = user?.last_active?.startsWith(today) ?? false;
  const dailyXpEarned = user?.daily_xp_date === today ? (user?.daily_xp_earned || 0) : 0;
  return {
    streak: user?.streak || 0,
    lastActive: user?.last_active || null,
    freezes: freeze?.quantity || 0,
    checkedInToday,
    dailyXpEarned,
    dailyXpGoal: user?.daily_xp_goal || 20,
    points: user?.points || 0,
    level: user?.level || 1,
  };
}

export async function addStreakFreeze(userId: string, qty = 1): Promise<void> {
  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    const existing = db.prepare('SELECT user_id FROM streak_freezes WHERE user_id = ?').get(userId);
    if (existing) {
      db.prepare(`UPDATE streak_freezes SET quantity = quantity + ?, updated_at = datetime('now') WHERE user_id = ?`).run(qty, userId);
    } else {
      db.prepare('INSERT INTO streak_freezes (id, user_id, quantity) VALUES (?, ?, ?)').run(nanoid(), userId, qty);
    }
  });
}
