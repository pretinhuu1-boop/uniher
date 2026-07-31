import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';

export const POST = withAuth(async (_req, context) => {
  const userId = context.auth.userId;
  const db = getReadDb();

  const user = db.prepare(`
    SELECT id, role, company_id, is_master_admin, must_change_password, password_reset_required
    FROM users
    WHERE id = ?
  `).get(userId) as {
    id: string;
    role: string;
    company_id: string | null;
    is_master_admin: number;
    must_change_password: number;
    password_reset_required: number;
  } | undefined;

  if (!user) {
    return NextResponse.json({ error: 'Usuario nao encontrado' }, { status: 404 });
  }

  if (user.password_reset_required) {
    return NextResponse.json(
      { error: 'Redefinicao de senha por link obrigatoria' },
      { status: 403 },
    );
  }

  if (user.must_change_password) {
    return NextResponse.json(
      { error: 'Troca de senha obrigatoria' },
      { status: 403 },
    );
  }

  return NextResponse.json({ success: true });
});
