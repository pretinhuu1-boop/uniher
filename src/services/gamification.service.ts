import { getWriteQueue } from '@/lib/db';

/**
 * Credita a conclusão da avaliação NR-1 (COPSOQ) como evento de PARTICIPAÇÃO.
 * Recebe SÓ userId/companyId — NUNCA respostas/score/dimensão (muro LGPD: a gamificação
 * só enxerga o booleano de conclusão).
 *
 * Difere de addPoints DE PROPÓSITO (conformidade — NÃO trocar por addPoints):
 *  - NÃO escreve em user_leagues.week_points → a conclusão jamais entra no ranking entre
 *    colegas (jogar triagem de saúde mental no leaderboard enviesa o instrumento e fere a LGPD).
 *  - NÃO toca daily_xp_earned/streak → evita "fechar a meta do dia"/pressão temporal sobre as respostas.
 * Credita só o XP global (users.points/level) — recompensa o ATO de concluir, nunca o conteúdo.
 *
 * One-shot e idempotente: a guarda (COUNT) + o crédito ficam no MESMO enqueue; como a
 * write-queue serializa, não há TOCTOU. Re-submit/refazer = no-op (zero XP).
 */
export async function awardNr1Completion(
  userId: string,
  companyId: string,
): Promise<{ xpEarned: number; alreadyAwarded: boolean }> {
  const writeQueue = getWriteQueue();
  const result = await writeQueue.enqueue((db): { xpEarned: number; alreadyAwarded: boolean } => {
    const already = (db.prepare(
      "SELECT COUNT(*) as count FROM activity_log WHERE user_id = ? AND action = 'earn_points_nr1_completed'"
    ).get(userId) as { count: number }).count;
    if (already > 0) return { xpEarned: 0, alreadyAwarded: true };

    const cfg = db.prepare('SELECT xp_nr1 FROM gamification_config WHERE company_id = ?').get(companyId) as
      | { xp_nr1?: number }
      | undefined;
    const xp = cfg?.xp_nr1 ?? 60;

    const user = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined;
    if (!user) throw new Error('Usuário não encontrado');

    const newPoints = user.points + xp;
    const { level } = getLevelFromPoints(newPoints);
    db.prepare(`UPDATE users SET points = ?, level = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(newPoints, level, userId);
    // target_type explícito 'nr1_assessment'; SEM payload de respostas. É a fonte de verdade de "participou".
    db.prepare(
      `INSERT INTO activity_log (id, user_id, action, target_type, points_earned) VALUES (?, ?, 'earn_points_nr1_completed', 'nr1_assessment', ?)`
    ).run(nanoid(), userId, xp);
    return { xpEarned: xp, alreadyAwarded: false };
  });

  // Badge de participação (best-effort) — só na primeira vez.
  if (!result.alreadyAwarded) {
    try {
      await checkParticipationBadges(userId);
    } catch {
      /* badge é best-effort; não bloqueia o crédito nem a conclusão */
    }
  }
  return result;
}

/**
 * Desbloqueia badges de PARTICIPAÇÃO — lê SÓ activity_log (NUNCA health_scores/score).
 * Separado de checkAndUnlockBadges DE PROPÓSITO: aquela função lê health_scores
 * (badge_equilibrio), e a conclusão da NR-1 não pode tocar dado clínico (muro LGPD).
 * badge_nr1 tem points=0 → não credita XP (sem duplo-crédito com awardNr1Completion).
 */
export async function checkParticipationBadges(userId: string): Promise<string[]> {
  const db = getReadDb();
  const nr1Completed = (db.prepare(
    "SELECT COUNT(*) as count FROM activity_log WHERE user_id = ? AND action = 'earn_points_nr1_completed'"
  ).get(userId) as { count: number }).count;

  const unlockedIds = new Set(
    (db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId) as { badge_id: string }[]).map(
      (r) => r.badge_id,
    ),
  );

  const CONDITIONS: { id: string; check: boolean }[] = [{ id: 'badge_nr1', check: nr1Completed >= 1 }];

  const writeQueue = getWriteQueue();
  const newlyUnlocked: string[] = [];
  for (const { id, check } of CONDITIONS) {
    if (check && !unlockedIds.has(id)) {
      await writeQueue.enqueue((db) => {
        const badge = db.prepare('SELECT * FROM badges WHERE id = ?').get(id) as { icon: string; name: string } | undefined;
        if (!badge) return;
        try {
          db.prepare("INSERT INTO user_badges (user_id, badge_id, unlocked_at) VALUES (?, ?, datetime('now'))").run(userId, id);
        } catch {
          return;
        }
        // badge_nr1 tem points=0 → NÃO altera users.points (sem duplo-crédito). Só notifica.
        db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'badge', ?, ?)`)
          .run(nanoid(), userId, `${badge.icon} Badge desbloqueado!`, `Você conquistou "${badge.name}".`);
      });
      newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}

export async function dailyCheckIn(userId: string): Promise<{
  newStreak: number;
  alreadyDone: boolean;
}> {
  return getWriteQueue().enqueue((db) => {
    const user = db.prepare('SELECT streak, last_active FROM users WHERE id = ?').get(userId) as {
      streak: number;
      last_active: string | null;
    } | undefined;
    if (!user) throw new Error('User not found');

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const lastActive = user.last_active?.slice(0, 10) ?? null;
    if (lastActive === today) {
      return { newStreak: user.streak || 0, alreadyDone: true };
    }

    const newStreak = lastActive === yesterday ? (user.streak || 0) + 1 : 1;
    db.prepare(`
      UPDATE users
      SET streak = ?, last_active = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(newStreak, userId);
    return { newStreak, alreadyDone: false };
  });
}

export async function updateStreak(userId: string): Promise<number> {
  return (await dailyCheckIn(userId)).newStreak;
}

export function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
  return monday.toISOString().slice(0, 10);
}
