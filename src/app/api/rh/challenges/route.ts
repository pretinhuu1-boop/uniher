/**
 * RH Challenge Management
 * GET  /api/rh/challenges        — list company challenges (defaults + custom)
 * POST /api/rh/challenges        — create a new custom challenge
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const CreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(500),
  category: z.string().min(2).max(60),
  points: z.number().int().min(1).max(5000),
  total_steps: z.number().int().min(1).max(1000),
  deadline: z.string().optional().nullable(),
});

export const GET = withRole('rh', 'lideranca')(async (_req, context) => {
  const userId = context.auth.userId;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ challenges: [] });

  // Platform defaults visible to this company + company's own custom challenges
  const challenges = db.prepare(`
    SELECT c.*, u.name as created_by_name
    FROM challenges c
    LEFT JOIN users u ON u.id = c.created_by
    WHERE (c.is_default = 1 OR c.company_id = ?)
    ORDER BY c.is_default DESC, c.created_at DESC
  `).all(user.company_id) as any[];

  return NextResponse.json({ challenges });
});

export const POST = withRole('rh')(async (req, context) => {
  const userId = context.auth.userId;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { title, description, category, points, total_steps, deadline } = parsed.data;
  const id = nanoid();

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`
      INSERT INTO challenges (id, title, description, category, points, total_steps, deadline, company_id, created_by, is_default, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'))
    `).run(id, title, description, category, points, total_steps, deadline || null, user.company_id, userId);
  });

  return NextResponse.json({ success: true, id });
});
