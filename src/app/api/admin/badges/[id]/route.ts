import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  icon: z.string().min(1).max(10).optional(),
  points: z.number().int().min(0).optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
});

export const PATCH = withRole('admin')(async (req: NextRequest, context) => {
  await initDb();
  const params = await context.params;
  const { id } = params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const fields = parsed.data;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const setClauses = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = Object.values(fields);

  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare(`UPDATE badges SET ${setClauses} WHERE id = ?`).run(...values, id);
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withRole('admin')(async (_req: NextRequest, context) => {
  await initDb();
  const params = await context.params;
  const { id } = params;

  const db = getReadDb();

  // Check if any user has this badge
  const holderCount = (
    db.prepare('SELECT COUNT(*) as count FROM user_badges WHERE badge_id = ?').get(id) as { count: number }
  ).count;

  if (holderCount > 0) {
    return NextResponse.json(
      { error: `Não é possível excluir: ${holderCount} usuário(s) possuem este badge` },
      { status: 409 }
    );
  }

  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    db.prepare('DELETE FROM badges WHERE id = ?').run(id);
  });

  return NextResponse.json({ success: true });
});
