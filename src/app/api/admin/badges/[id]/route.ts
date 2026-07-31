import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { runAsActiveMasterAdminActor } from '@/lib/security/active-rh-actor';

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  icon: z.string().min(1).max(10).optional(),
  points: z.number().int().min(0).optional(),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).optional(),
});

function expiredAuthorizationResponse() {
  return NextResponse.json(
    { error: 'Autorizacao administrativa expirou' },
    { status: 409 },
  );
}

export const PATCH = withMasterAdmin(async (req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: 'Nenhum campo para atualizar' },
      { status: 400 },
    );
  }

  const setClauses = Object.keys(parsed.data)
    .map((key) => `${key} = ?`)
    .join(', ');
  const values = Object.values(parsed.data);
  const writeQueue = getWriteQueue();
  const outcome = await writeQueue.enqueue((db) => (
    runAsActiveMasterAdminActor(db, context.auth.userId, () => (
      db.prepare(`UPDATE badges SET ${setClauses} WHERE id = ?`)
        .run(...values, id).changes === 1
    ))
  ), 'update badge as Master Admin', { retryOnFailure: false });

  if (!outcome.authorized) return expiredAuthorizationResponse();
  if (!outcome.value) {
    return NextResponse.json({ error: 'Badge nao encontrado' }, { status: 409 });
  }
  return NextResponse.json({ success: true });
});

export const DELETE = withMasterAdmin(async (_req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const writeQueue = getWriteQueue();
  const outcome = await writeQueue.enqueue((db) => (
    runAsActiveMasterAdminActor(db, context.auth.userId, () => {
      const holderCount = (
        db.prepare('SELECT COUNT(*) as count FROM user_badges WHERE badge_id = ?')
          .get(id) as { count: number }
      ).count;
      if (holderCount > 0) {
        return { status: 'in_use' as const, holderCount };
      }

      const deleted = db.prepare('DELETE FROM badges WHERE id = ?').run(id);
      return deleted.changes === 1
        ? { status: 'deleted' as const }
        : { status: 'not_found' as const };
    })
  ), 'delete badge as Master Admin', { retryOnFailure: false });

  if (!outcome.authorized) return expiredAuthorizationResponse();
  if (outcome.value.status === 'in_use') {
    return NextResponse.json(
      {
        error: `Nao e possivel excluir: ${outcome.value.holderCount} usuario(s) possuem este badge`,
      },
      { status: 409 },
    );
  }
  if (outcome.value.status === 'not_found') {
    return NextResponse.json({ error: 'Badge nao encontrado' }, { status: 409 });
  }
  return NextResponse.json({ success: true });
});
