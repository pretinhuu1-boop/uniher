/**
 * RH Challenge Item Management
 * PATCH  /api/rh/challenges/[id]  — edit, activate/deactivate, or restore defaults
 * DELETE /api/rh/challenges/[id]  — delete a custom challenge (not defaults)
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { z } from 'zod';

const PatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('update'),
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(5).max(500).optional(),
    category: z.string().min(2).max(60).optional(),
    points: z.number().int().min(1).max(5000).optional(),
    total_steps: z.number().int().min(1).max(1000).optional(),
    deadline: z.string().optional().nullable(),
  }),
  z.object({ action: z.literal('deactivate') }),
  z.object({ action: z.literal('activate') }),
  z.object({ action: z.literal('restore_default') }), // re-creates from original default
]);

export const PATCH = withRole('rh')(async (req, context) => {
  const userId = context.auth.userId;
  const { id } = await context.params;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  // Pre-filter: only fetch challenges belonging to this company or defaults
  const challenge = db.prepare(
    'SELECT * FROM challenges WHERE id = ? AND (company_id = ? OR is_default = 1)'
  ).get(id, user.company_id) as any;
  if (!challenge) return NextResponse.json({ error: 'Desafio não encontrado' }, { status: 404 });

  const isDefault = challenge.is_default === 1;
  const isOwn = challenge.company_id === user.company_id;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const data = parsed.data;
  const wq = getWriteQueue();

  if (data.action === 'deactivate') {
    if (isDefault) {
      // Create a company-specific override that marks it inactive
      await wq.enqueue((db) => {
        db.prepare(`
          INSERT OR REPLACE INTO challenges (id, title, description, category, points, total_steps, deadline, company_id, created_by, is_default, is_active, overridden_from, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, datetime('now'))
        `).run(nanoid(), challenge.title, challenge.description, challenge.category, challenge.points,
            challenge.total_steps, challenge.deadline, user.company_id, userId, challenge.id);
      });
    } else {
      await wq.enqueue((db) => {
        db.prepare(`UPDATE challenges SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).run(id);
      });
    }
    return NextResponse.json({ success: true, action: 'deactivated' });
  }

  if (data.action === 'activate') {
    await wq.enqueue((db) => {
      db.prepare(`UPDATE challenges SET is_active = 1, updated_at = datetime('now') WHERE id = ?`).run(id);
    });
    return NextResponse.json({ success: true, action: 'activated' });
  }

  if (data.action === 'restore_default') {
    if (!challenge.overridden_from) return NextResponse.json({ error: 'Este desafio não é uma sobrescrita de padrão' }, { status: 400 });
    // Delete the override, restoring visibility of the original
    await wq.enqueue((db) => {
      db.prepare('DELETE FROM challenges WHERE id = ? AND company_id = ? AND is_default = 0').run(id, user.company_id);
    });
    return NextResponse.json({ success: true, action: 'restored' });
  }

  if (data.action === 'update') {
    if (isDefault) return NextResponse.json({ error: 'Não é possível editar desafios padrão diretamente. Crie uma cópia personalizada.' }, { status: 400 });
    const fields: string[] = [];
    const values: any[] = [];
    if (data.title) { fields.push('title = ?'); values.push(data.title); }
    if (data.description) { fields.push('description = ?'); values.push(data.description); }
    if (data.category) { fields.push('category = ?'); values.push(data.category); }
    if (data.points !== undefined) { fields.push('points = ?'); values.push(data.points); }
    if (data.total_steps !== undefined) { fields.push('total_steps = ?'); values.push(data.total_steps); }
    if ('deadline' in data) { fields.push('deadline = ?'); values.push(data.deadline || null); }
    if (!fields.length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });

    await wq.enqueue((db) => {
      db.prepare(`UPDATE challenges SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
    });
    return NextResponse.json({ success: true, action: 'updated' });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
});

export const DELETE = withRole('rh')(async (_req, context) => {
  const userId = context.auth.userId;
  const { id } = await context.params;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;

  // Pre-filter by company_id to prevent IDOR
  const challenge = db.prepare(
    'SELECT * FROM challenges WHERE id = ? AND company_id = ?'
  ).get(id, user?.company_id) as any;
  if (!challenge) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (challenge.is_default) return NextResponse.json({ error: 'Desafios padrão não podem ser excluídos' }, { status: 403 });

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare('DELETE FROM challenges WHERE id = ?').run(id);
  });
  return NextResponse.json({ success: true });
});
