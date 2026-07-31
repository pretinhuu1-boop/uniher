import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getWriteQueue } from '@/lib/db';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['next', 'active', 'done']).optional(),
  color: z.string().optional(),
  status_label: z.string().optional(),
  start_date: z.string().regex(dateRegex, 'Formato YYYY-MM-DD').optional().nullable(),
  end_date: z.string().regex(dateRegex, 'Formato YYYY-MM-DD').optional().nullable(),
  theme: z.string().optional().nullable(),
  theme_color: z.string().optional().nullable(),
});

// PATCH /api/campaigns/[id] — Atualizar campanha (apenas RH)
export const PATCH = withRole('rh')(async (req, context) => {
  try {
    await initDb();

    const { id } = await context.params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const companyId = context.auth.companyId;
    if (!companyId || context.auth.role !== 'rh') {
      return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
    }

    const { name, status, color, status_label, start_date, end_date, theme, theme_color } = parsed.data;

    // Build dynamic update — whitelist de campos
    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (color !== undefined) { fields.push('color = ?'); values.push(color); }
    if (status_label !== undefined) { fields.push('status_label = ?'); values.push(status_label); }
    if (start_date !== undefined) { fields.push('start_date = ?'); values.push(start_date); }
    if (end_date !== undefined) { fields.push('end_date = ?'); values.push(end_date); }
    if (theme !== undefined) { fields.push('theme = ?'); values.push(theme); }
    if (theme_color !== undefined) { fields.push('theme_color = ?'); values.push(theme_color); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const writeQueue = getWriteQueue();
    const outcome = await writeQueue.enqueue((wdb) => (
      runAsActiveRhActor(wdb, context.auth.userId, companyId, () => {
        const campaign = wdb.prepare(`
          SELECT id
          FROM campaigns
          WHERE id = ? AND company_id = ?
        `).get(id, companyId);
        if (!campaign) return false;

        const updated = wdb.prepare(`
          UPDATE campaigns
          SET ${fields.join(', ')}
          WHERE id = ? AND company_id = ?
        `).run(...values, id, companyId);
        return updated.changes === 1;
      })
    ), 'update RH campaign', { retryOnFailure: false });

    if (!outcome.authorized) {
      return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
    }
    if (!outcome.value) {
      return NextResponse.json({ error: 'Campanha não encontrada ou alterada' }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});

// DELETE /api/campaigns/[id] — Excluir campanha (apenas RH)
export const DELETE = withRole('rh')(async (_req, context) => {
  try {
    await initDb();

    const { id } = await context.params;
    const companyId = context.auth.companyId;
    if (!companyId || context.auth.role !== 'rh') {
      return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
    }

    const writeQueue = getWriteQueue();
    const outcome = await writeQueue.enqueue((wdb) => (
      runAsActiveRhActor(wdb, context.auth.userId, companyId, () => {
        const campaign = wdb.prepare(`
          SELECT id
          FROM campaigns
          WHERE id = ? AND company_id = ?
        `).get(id, companyId);
        if (!campaign) return false;

        const deleted = wdb.prepare(`
          DELETE FROM campaigns
          WHERE id = ? AND company_id = ?
        `).run(id, companyId);
        return deleted.changes === 1;
      })
    ), 'delete RH campaign', { retryOnFailure: false });

    if (!outcome.authorized) {
      return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
    }
    if (!outcome.value) {
      return NextResponse.json({ error: 'Campanha não encontrada ou alterada' }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
