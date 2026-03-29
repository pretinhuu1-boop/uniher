import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';

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

    const db = getReadDb();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as { company_id: string } | undefined;

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    if (campaign.company_id !== context.auth.companyId) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
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

    values.push(id);
    const sql = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = ?`;
    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      wdb.prepare(sql).run(...values);
    });

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
    const db = getReadDb();
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as { company_id: string } | undefined;

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    if (campaign.company_id !== context.auth.companyId) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 });
    }

    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      wdb.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
