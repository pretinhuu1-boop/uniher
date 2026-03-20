import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getWeekStart } from './gamification.service';

export const LEAGUES = ['bronze', 'prata', 'ouro', 'safira', 'rubi', 'esmeralda', 'diamante'] as const;
export type League = (typeof LEAGUES)[number];

export const LEAGUE_META: Record<League, { label: string; color: string; icon: string; promoteTop: number; relegateBottom: number }> = {
  bronze:    { label: 'Bronze',    color: '#CD7F32', icon: '🥉', promoteTop: 10, relegateBottom: 0 },
  prata:     { label: 'Prata',     color: '#A8A9AD', icon: '🥈', promoteTop: 10, relegateBottom: 5 },
  ouro:      { label: 'Ouro',      color: '#FFD700', icon: '🥇', promoteTop: 10, relegateBottom: 5 },
  safira:    { label: 'Safira',    color: '#0F52BA', icon: '💎', promoteTop: 10, relegateBottom: 5 },
  rubi:      { label: 'Rubi',      color: '#E0115F', icon: '♦️', promoteTop: 10, relegateBottom: 5 },
  esmeralda: { label: 'Esmeralda', color: '#50C878', icon: '💚', promoteTop: 10, relegateBottom: 5 },
  diamante:  { label: 'Diamante',  color: '#B9F2FF', icon: '💠', promoteTop: 0,  relegateBottom: 5 },
};

export interface LeagueEntry {
  rank: number;
  user_id: string;
  name: string;
  avatar_url: string | null;
  week_points: number;
  league: League;
}

export function getLeagueRanking(league: League, weekStart?: string): LeagueEntry[] {
  const db = getReadDb();
  const ws = weekStart || getWeekStart();
  const rows = db.prepare(`
    SELECT ul.user_id, ul.week_points, ul.league, u.name, u.avatar_url
    FROM user_leagues ul
    JOIN users u ON u.id = ul.user_id
    WHERE ul.week_start = ? AND ul.league = ?
    ORDER BY ul.week_points DESC
    LIMIT 50
  `).all(ws, league) as any[];

  return rows.map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    name: r.name,
    avatar_url: r.avatar_url,
    week_points: r.week_points,
    league: r.league as League,
  }));
}

export function getUserLeagueStatus(userId: string): {
  currentLeague: League;
  rank: number;
  weekPoints: number;
  totalInLeague: number;
  weekStart: string;
  promoteZone: boolean;
  relegateZone: boolean;
  meta: typeof LEAGUE_META[League];
} {
  const db = getReadDb();
  const ws = getWeekStart();

  const entry = db.prepare('SELECT * FROM user_leagues WHERE user_id = ? AND week_start = ?').get(userId, ws) as any;
  const user = db.prepare('SELECT league FROM users WHERE id = ?').get(userId) as any;
  const currentLeague = (entry?.league || user?.league || 'bronze') as League;
  const weekPoints = entry?.week_points || 0;

  // Count rank within league
  const above = db.prepare('SELECT COUNT(*) as c FROM user_leagues WHERE week_start = ? AND league = ? AND week_points > ?')
    .get(ws, currentLeague, weekPoints) as { c: number };
  const rank = above.c + 1;

  const total = db.prepare('SELECT COUNT(*) as c FROM user_leagues WHERE week_start = ? AND league = ?')
    .get(ws, currentLeague) as { c: number };

  const meta = LEAGUE_META[currentLeague];
  const promoteZone = rank <= meta.promoteTop;
  const relegateZone = meta.relegateBottom > 0 && rank > (total.c - meta.relegateBottom);

  return { currentLeague, rank, weekPoints, totalInLeague: total.c, weekStart: ws, promoteZone, relegateZone, meta };
}

/** Run end-of-week league promotions/demotions — call this from a cron/scheduled job */
export async function processLeagueTransitions(weekStart: string): Promise<void> {
  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    for (const league of LEAGUES) {
      const meta = LEAGUE_META[league];
      const rows = db.prepare(`
        SELECT ul.user_id, ul.week_points, u.league as user_league
        FROM user_leagues ul JOIN users u ON u.id = ul.user_id
        WHERE ul.week_start = ? AND ul.league = ?
        ORDER BY ul.week_points DESC
      `).all(weekStart, league) as any[];

      rows.forEach((row, idx) => {
        const rank = idx + 1;
        const leagueIndex = LEAGUES.indexOf(league);

        if (meta.promoteTop > 0 && rank <= meta.promoteTop && leagueIndex < LEAGUES.length - 1) {
          const nextLeague = LEAGUES[leagueIndex + 1];
          db.prepare(`UPDATE users SET league = ?, updated_at = datetime('now') WHERE id = ?`).run(nextLeague, row.user_id);
          db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'badge', ?, ?)`)
            .run(nanoid(), row.user_id, `${LEAGUE_META[nextLeague].icon} Promovida para ${LEAGUE_META[nextLeague].label}!`,
              `Parabéns! Você foi promovida para a liga ${LEAGUE_META[nextLeague].label}.`);
        } else if (meta.relegateBottom > 0 && rank > rows.length - meta.relegateBottom && leagueIndex > 0) {
          const prevLeague = LEAGUES[leagueIndex - 1];
          db.prepare(`UPDATE users SET league = ?, updated_at = datetime('now') WHERE id = ?`).run(prevLeague, row.user_id);
          db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'system', ?, ?)`)
            .run(nanoid(), row.user_id, `Rebaixada para ${LEAGUE_META[prevLeague].label}`,
              `Pontue mais esta semana para subir de liga!`);
        }
      });
    }
  });
}

export function ensureUserInLeague(userId: string, league: League): void {
  const wq = getWriteQueue();
  const ws = getWeekStart();
  wq.enqueue((db) => {
    const exists = db.prepare('SELECT id FROM user_leagues WHERE user_id = ? AND week_start = ?').get(userId, ws);
    if (!exists) {
      db.prepare('INSERT INTO user_leagues (id, user_id, league, week_points, week_start) VALUES (?, ?, ?, 0, ?)')
        .run(nanoid(), userId, league, ws);
    }
  });
}
