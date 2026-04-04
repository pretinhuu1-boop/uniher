/**
 * GET  /api/invites/[token]  — validar token de convite (público)
 * POST /api/invites/[token]  — aceitar convite + criar conta
 * DELETE /api/invites/[token] — revogar convite (RH)
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookiesOnResponse } from '@/lib/auth/cookies';

const RegisterSchema = z.object({
  name: z.string().min(2).max(120),
  password: z.string().min(8).max(72),
});

// Público — validar token
export async function GET(req: Request, segmentData: { params: Promise<{ token: string }> }) {
  const { token } = await segmentData.params;
  await initDb();
  const db = getReadDb();

  const invite = db.prepare(`
    SELECT i.*, c.name as company_name, d.name as department_name
    FROM invites i
    JOIN companies c ON c.id = i.company_id
    LEFT JOIN departments d ON d.id = i.department_id
    WHERE i.token = ?
  `).get(token) as any;

  if (!invite) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 });
  if (invite.status !== 'pending') return NextResponse.json({ error: 'Este convite já foi utilizado ou expirou', status: invite.status }, { status: 410 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    // Expire it
    const wq = getWriteQueue();
    wq.enqueue((db) => { db.prepare(`UPDATE invites SET status = 'expired' WHERE token = ?`).run(token); });
    return NextResponse.json({ error: 'Convite expirado' }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    name: invite.name || '',
    email: invite.email,
    role: invite.role,
    companyName: invite.company_name,
    departmentName: invite.department_name,
  });
}

// Público — aceitar convite e criar conta
export async function POST(req: Request, segmentData: { params: Promise<{ token: string }> }) {
  const { token } = await segmentData.params;
  await initDb();
  const db = getReadDb();

  const invite = db.prepare('SELECT * FROM invites WHERE token = ? AND status = ?').get(token, 'pending') as any;
  if (!invite) return NextResponse.json({ error: 'Convite inválido ou expirado' }, { status: 404 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Convite expirado' }, { status: 410 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { name, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const userId = nanoid();

  // Check if email already exists
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(invite.email);
  if (existingUser) {
    return NextResponse.json({ error: 'Este email já possui uma conta. Faça login.' }, { status: 409 });
  }

  const wq = getWriteQueue();
  try {
    await wq.enqueue((db) => {
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, company_id, department_id, league, approved, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'bronze', 0, datetime('now'), datetime('now'))
      `).run(userId, name, invite.email, passwordHash, invite.role, invite.company_id, invite.department_id || null);

      db.prepare(`UPDATE invites SET status = 'accepted', accepted_at = datetime('now') WHERE token = ?`).run(token);
    });
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Este email já possui uma conta.' }, { status: 409 });
    }
    throw err;
  }

  // Gerar tokens JWT
  const accessToken = await signAccessToken({
    userId,
    role: invite.role,
    companyId: invite.company_id,
  });
  const refreshToken = await signRefreshToken({ userId });

  // Salvar refresh token (hashed)
  const { createHash } = await import('crypto');
  const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
  await wq.enqueue((db) => {
    db.prepare("INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+30 days'))")
      .run(nanoid(), userId, tokenHash);
  });

  const response = NextResponse.json({ success: true, message: 'Conta criada com sucesso!' });
  return setAuthCookiesOnResponse(response, accessToken, refreshToken);
}

// RH — revogar convite
export const DELETE = withRole('rh')(async (_req, context) => {
  const userId = context.auth.userId;
  const { token } = await context.params;
  await initDb();
  const db = getReadDb();

  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  const invite = db.prepare('SELECT * FROM invites WHERE token = ?').get(token) as any;

  if (!invite) return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });
  if (invite.company_id !== user?.company_id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`UPDATE invites SET status = 'expired' WHERE token = ?`).run(token);
  });

  return NextResponse.json({ success: true });
});
