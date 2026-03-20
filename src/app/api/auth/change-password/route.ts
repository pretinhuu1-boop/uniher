import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { hashPassword } from '@/lib/auth/password';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';

const Schema = z.object({
  newPassword: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Precisa de 1 letra maiúscula')
    .regex(/[a-z]/, 'Precisa de 1 letra minúscula')
    .regex(/[0-9]/, 'Precisa de 1 número')
    .regex(/[!@#$%&*]/, 'Precisa de 1 caractere especial (!@#$%&*)'),
});

export const POST = withAuth(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = datetime('now') WHERE id = ?")
      .run(passwordHash, context.auth.userId);
  });

  return NextResponse.json({ success: true });
});
