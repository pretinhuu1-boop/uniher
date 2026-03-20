import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getUserById, toPublicUser } from '@/repositories/user.repository';
import { getWriteQueue } from '@/lib/db';
import { z } from 'zod';

export const GET = withAuth(async (_req: NextRequest, context) => {
  const user = getUserById(context.auth.userId);
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }
  return NextResponse.json({ user: toPublicUser(user) });
});

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  cargo: z.string().max(100).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().max(20).optional(),
}).strict();

export const PATCH = withAuth(async (req: NextRequest, context) => {
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, emergency_contact_name, emergency_contact_phone } = parsed.data;
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (emergency_contact_name !== undefined) { fields.push('emergency_contact_name = ?'); values.push(emergency_contact_name); }
    if (emergency_contact_phone !== undefined) { fields.push('emergency_contact_phone = ?'); values.push(emergency_contact_phone); }

    if (fields.length === 0) return;
    fields.push("updated_at = datetime('now')");
    values.push(context.auth.userId);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  });

  const updated = getUserById(context.auth.userId);
  if (!updated) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  return NextResponse.json({ user: toPublicUser(updated) });
});
