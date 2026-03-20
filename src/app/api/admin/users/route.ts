/**
 * POST /api/admin/users — create a new master (admin) user
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const CreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'rh', 'lideranca', 'colaboradora']).default('admin'),
  company_id: z.string().optional().nullable(),
});

export const POST = withRole('admin')(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { name, email, password, role, company_id } = parsed.data;
  const db = getReadDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const id = nanoid();

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, company_id, approved, level, points, streak, must_change_password)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0, 0, 1)
    `).run(id, name, email, passwordHash, role, company_id ?? null);
  });

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'user_create',
    entityType: 'user',
    entityId: id,
    entityLabel: name,
    details: { email, role: role ?? 'admin' },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ success: true, id });
});
