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
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';

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
  const companyId = context.auth.companyId;
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { name, description, type, department_id, icon, color } = parsed.data;
  const id = nanoid();

  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, userId, companyId, () => {
      if (type === 'department' && !department_id) {
        return { status: 'invalid_department' as const };
      }
      if (department_id) {
        const department = db.prepare(`
          SELECT id
          FROM departments
          WHERE id = ? AND company_id = ?
        `).get(department_id, companyId);
        if (!department) return { status: 'invalid_department' as const };
      }

      db.prepare(`
        INSERT INTO custom_leagues (id, company_id, name, description, type, department_id, icon, color, created_by, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(id, companyId, name, description || null, type, department_id || null, icon, color, userId);

      if (type === 'department' && department_id) {
        const ws = getWeekStart();
        const deptUsers = db.prepare(`
          SELECT id
          FROM users
          WHERE department_id = ? AND company_id = ?
        `).all(department_id, companyId) as { id: string }[];
        for (const departmentUser of deptUsers) {
          db.prepare(`
            INSERT OR IGNORE INTO custom_league_members
              (id, league_id, user_id, week_points, week_start)
            VALUES (?, ?, ?, 0, ?)
          `).run(nanoid(), id, departmentUser.id, ws);
        }
      }

      if (type === 'company') {
        const ws = getWeekStart();
        const companyUsers = db.prepare(`
          SELECT id
          FROM users
          WHERE company_id = ? AND role = 'colaboradora'
        `).all(companyId) as { id: string }[];
        for (const companyUser of companyUsers) {
          db.prepare(`
            INSERT OR IGNORE INTO custom_league_members
              (id, league_id, user_id, week_points, week_start)
            VALUES (?, ?, ?, 0, ?)
          `).run(nanoid(), id, companyUser.id, ws);
        }
      }

      return { status: 'created' as const };
    })
  ), 'create RH league', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
  }
  if (outcome.value.status === 'invalid_department') {
    return NextResponse.json({ error: 'Departamento não pertence à empresa' }, { status: 409 });
  }

  return NextResponse.json({ success: true, id });
});
