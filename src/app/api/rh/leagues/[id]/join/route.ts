/**
 * Opt-in/out of a custom league
 * POST   /api/rh/leagues/[id]/join  — join (collaboradora)
 * DELETE /api/rh/leagues/[id]/join  — leave
 */
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { getWeekStart } from '@/services/gamification.service';

export const POST = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const { id: leagueId } = await context.params;
  const db = getReadDb();

  const league = db.prepare('SELECT * FROM custom_leagues WHERE id = ? AND is_active = 1').get(leagueId) as any;
  if (!league) return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });
  if (league.type !== 'opt_in') return NextResponse.json({ error: 'Esta liga não permite inscrição manual' }, { status: 400 });

  const ws = getWeekStart();
  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare('INSERT OR IGNORE INTO custom_league_members (id, league_id, user_id, week_points, week_start) VALUES (?, ?, ?, 0, ?)')
      .run(nanoid(), leagueId, userId, ws);
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const { id: leagueId } = await context.params;
  const db = getReadDb();

  const league = db.prepare('SELECT type FROM custom_leagues WHERE id = ?').get(leagueId) as any;
  if (!league) return NextResponse.json({ error: 'Liga não encontrada' }, { status: 404 });
  if (league.type !== 'opt_in') return NextResponse.json({ error: 'Não é possível sair desta liga' }, { status: 400 });

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare('DELETE FROM custom_league_members WHERE league_id = ? AND user_id = ?').run(leagueId, userId);
  });
  return NextResponse.json({ success: true });
});
