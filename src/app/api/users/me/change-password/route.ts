import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { z } from 'zod';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
});

export const POST = withAuth(async (req, context) => {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Senha fraca. Mínimo 8 caracteres com maiúscula, minúscula, número e especial.' }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const userId = context.auth.userId;

  const db = getReadDb();
  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const valid = await verifyPassword(currentPassword, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 403 });
  }

  const newHash = await hashPassword(newPassword);
  await getWriteQueue().enqueue(() => {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
      .run(newHash, new Date().toISOString(), userId);
  });

  return NextResponse.json({ success: true, message: 'Senha alterada com sucesso!' });
});
