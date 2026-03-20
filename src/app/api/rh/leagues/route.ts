/**
 * RH Custom League Management
 * GET  /api/rh/leagues   — list custom leagues for company
 * POST /api/rh/leagues   — create a new custom league
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getWeekStart } from '@/services/gamification.service';

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  type: z.enum(['opt_in', 'department', 'company']).default('opt_in'),
  department_id: z.string().optional().nullable(),
  icon: z.string().max(4).optional().default('🏆'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#C8547E'),
});

export const GET = withRole('rh', 'lideranca')(async (_req, context) => {
  await initDb();
  const userId = context.auth.userId;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ leagues: [] });

  const leagues = db.prepare(`
    SELECT cl.*, u.name as created_by_name,
           COUNT(DISTINCT clm.user_id) as member_count
    FROM custom_leagues cl
    LEFT JOIN users u ON u.id = cl.created_by
    LEFT JOIN custom_league_members clm ON clm.league_id = cl.id
    WHERE cl.company_id = ?
    GROUP BY cl.id
    ORDER BY cl.created_at DESC
  `).all(user.company_id) as any[];

  return NextResponse.json({ leagues });
});

export const POST = withRole('rh')(async (req, context) => {
  await initDb();
  const userId = context.auth.userId;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { name, description, type, department_id, icon, color } = parsed.data;
  const id = nanoid();

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`
      INSERT INTO custom_leagues (id, company_id, name, description, type, department_id, icon, color, created_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, user.company_id, name, description || null, type, department_id || null, icon, color, userId);

    // For department leagues, auto-enroll all department members
    if (type === 'department' && department_id) {
      const ws = getWeekStart();
      const deptUsers = db.prepare('SELECT id FROM users WHERE department_id = ? AND company_id = ?').all(department_id, user.company_id) as any[];
      for (const du of deptUsers) {
        db.prepare('INSERT OR IGNORE INTO custom_league_members (id, league_id, user_id, week_points, week_start) VALUES (?, ?, ?, 0, ?)')
          .run(nanoid(), id, du.id, ws);
      }
    }

    // For company leagues, auto-enroll everyone
    if (type === 'company') {
      const ws = getWeekStart();
      const companyUsers = db.prepare('SELECT id FROM users WHERE company_id = ? AND role = ?').all(user.company_id, 'colaboradora') as any[];
      for (const cu of companyUsers) {
        db.prepare('INSERT OR IGNORE INTO custom_league_members (id, league_id, user_id, week_points, week_start) VALUES (?, ?, ?, 0, ?)')
          .run(nanoid(), id, cu.id, ws);
      }
    }
  });

  return NextResponse.json({ success: true, id });
});
