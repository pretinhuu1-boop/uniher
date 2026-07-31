/**
 * RH Challenge Item Management
 * PATCH  /api/rh/challenges/[id]  — edit, activate/deactivate, or restore defaults
 * DELETE /api/rh/challenges/[id]  — delete a custom challenge (not defaults)
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';
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

interface ChallengeWriteRow {
  id: string;
  title: string;
  description: string;
  category: string;
  points: number;
  total_steps: number;
  deadline: string | null;
  company_id: string | null;
  is_default: number;
  overridden_from: string | null;
}

export const PATCH = withRole('rh')(async (req, context) => {
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
  }
  const { id } = await context.params;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const data = parsed.data;
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, userId, companyId, () => {
      const challenge = db.prepare(`
        SELECT *
        FROM challenges
        WHERE id = ?
          AND (
            (company_id = ? AND is_default = 0)
            OR (company_id IS NULL AND is_default = 1)
          )
      `).get(id, companyId) as ChallengeWriteRow | undefined;
      if (!challenge) return { status: 'missing' as const };

      const isGlobalDefault = challenge.company_id === null && challenge.is_default === 1;
      if (data.action === 'deactivate') {
        if (isGlobalDefault) {
          const existingOverride = db.prepare(`
            SELECT id
            FROM challenges
            WHERE company_id = ? AND overridden_from = ? AND is_default = 0
          `).get(companyId, id) as { id: string } | undefined;
          if (existingOverride) {
            db.prepare(`
              UPDATE challenges
              SET is_active = 0, updated_at = datetime('now')
              WHERE id = ? AND company_id = ? AND is_default = 0
            `).run(existingOverride.id, companyId);
          } else {
            db.prepare(`
              INSERT INTO challenges (
                id, title, description, category, points, total_steps, deadline,
                company_id, created_by, is_default, is_active, overridden_from, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, datetime('now'))
            `).run(
              nanoid(), challenge.title, challenge.description, challenge.category,
              challenge.points, challenge.total_steps, challenge.deadline,
              companyId, userId, challenge.id,
            );
          }
        } else {
          const updated = db.prepare(`
            UPDATE challenges
            SET is_active = 0, updated_at = datetime('now')
            WHERE id = ? AND company_id = ? AND is_default = 0
          `).run(id, companyId);
          if (updated.changes !== 1) return { status: 'missing' as const };
        }
        return { status: 'success' as const, action: 'deactivated' as const };
      }

      if (data.action === 'activate') {
        if (isGlobalDefault) return { status: 'global_forbidden' as const };
        const updated = db.prepare(`
          UPDATE challenges
          SET is_active = 1, updated_at = datetime('now')
          WHERE id = ? AND company_id = ? AND is_default = 0
        `).run(id, companyId);
        return updated.changes === 1
          ? { status: 'success' as const, action: 'activated' as const }
          : { status: 'missing' as const };
      }

      if (data.action === 'restore_default') {
        if (isGlobalDefault || !challenge.overridden_from) {
          return { status: 'not_override' as const };
        }
        const deleted = db.prepare(`
          DELETE FROM challenges
          WHERE id = ? AND company_id = ? AND is_default = 0
        `).run(id, companyId);
        return deleted.changes === 1
          ? { status: 'success' as const, action: 'restored' as const }
          : { status: 'missing' as const };
      }

      if (isGlobalDefault) return { status: 'global_forbidden' as const };
      const fields: string[] = [];
      const values: unknown[] = [];
      if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
      if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
      if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
      if (data.points !== undefined) { fields.push('points = ?'); values.push(data.points); }
      if (data.total_steps !== undefined) { fields.push('total_steps = ?'); values.push(data.total_steps); }
      if ('deadline' in data) { fields.push('deadline = ?'); values.push(data.deadline || null); }
      if (!fields.length) return { status: 'empty' as const };

      const updated = db.prepare(`
        UPDATE challenges
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE id = ? AND company_id = ? AND is_default = 0
      `).run(...values, id, companyId);
      return updated.changes === 1
        ? { status: 'success' as const, action: 'updated' as const }
        : { status: 'missing' as const };
    })
  ), 'update RH challenge', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
  }
  if (outcome.value.status === 'missing') {
    return NextResponse.json({ error: 'Desafio não encontrado ou alterado' }, { status: 409 });
  }
  if (outcome.value.status === 'global_forbidden') {
    return NextResponse.json({ error: 'Desafio global não pode ser alterado pelo RH' }, { status: 403 });
  }
  if (outcome.value.status === 'not_override') {
    return NextResponse.json({ error: 'Este desafio não é uma sobrescrita de padrão' }, { status: 400 });
  }
  if (outcome.value.status === 'empty') {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  return NextResponse.json({ success: true, action: outcome.value.action });
});

export const DELETE = withRole('rh')(async (_req, context) => {
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
  }
  const { id } = await context.params;

  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, userId, companyId, () => {
      const challenge = db.prepare(`
        SELECT id
        FROM challenges
        WHERE id = ? AND company_id = ? AND is_default = 0
      `).get(id, companyId);
      if (!challenge) return false;

      const deleted = db.prepare(`
        DELETE FROM challenges
        WHERE id = ? AND company_id = ? AND is_default = 0
      `).run(id, companyId);
      return deleted.changes === 1;
    })
  ), 'delete RH challenge', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
  }
  if (!outcome.value) {
    return NextResponse.json({ error: 'Desafio não encontrado ou alterado' }, { status: 409 });
  }
  return NextResponse.json({ success: true });
});
