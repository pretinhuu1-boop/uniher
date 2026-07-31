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
import { checkInviteAcceptRateLimit } from '@/lib/security/rate-limit';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';
import { handleApiError } from '@/lib/errors';
import { createHash } from 'crypto';

const RegisterSchema = z.object({
  name: z.string().min(2).max(120),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(72)
    .regex(/[A-Z]/, 'Senha precisa de pelo menos 1 letra maiuscula')
    .regex(/[a-z]/, 'Senha precisa de pelo menos 1 letra minuscula')
    .regex(/[0-9]/, 'Senha precisa de pelo menos 1 numero')
    .regex(/[!@#$%&*]/, 'Senha precisa de 1 caractere especial (!@#$%&*)'),
});

function maskInviteEmail(email: string): string {
  const [localPart, domainPart] = email.split('@');
  if (!localPart || !domainPart) return '***';

  const domainSegments = domainPart.split('.');
  const domainName = domainSegments.shift() ?? '';
  const suffix = domainSegments.length > 0 ? `.${domainSegments.join('.')}` : '';
  return `${localPart[0]}***@${domainName[0] ?? '*'}***${suffix}`;
}

// Público — validar token
export async function GET(req: Request, segmentData: { params: Promise<{ token: string }> }) {
  const { token } = await segmentData.params;
  await initDb();
  const db = getReadDb();

  const invite = db.prepare(`
    SELECT i.*, c.name as company_name, d.name as department_name
    FROM invites i
    JOIN companies c ON c.id = i.company_id
    LEFT JOIN departments d
      ON d.id = i.department_id
     AND d.company_id = i.company_id
    WHERE i.token = ?
  `).get(token) as any;

  if (!invite) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 });
  if (invite.status !== 'pending') return NextResponse.json({ error: 'Este convite já foi utilizado ou expirou', status: invite.status }, { status: 410 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Convite expirado' }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    name: invite.name || '',
    email: maskInviteEmail(invite.email),
    role: invite.role,
    companyName: invite.company_name,
    departmentName: invite.department_name,
  });
}

// Público — aceitar convite e criar conta
export async function POST(req: Request, segmentData: { params: Promise<{ token: string }> }) {
  const { token } = await segmentData.params;
  try {
    await checkInviteAcceptRateLimit(req, token);
  } catch (error) {
    return handleApiError(error);
  }

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

  const refreshToken = await signRefreshToken({ userId });
  const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

  const wq = getWriteQueue();
  try {
    const outcome = await wq.enqueue((db) => {
      const acceptInvite = db.transaction(() => {
        const currentInvite = db.prepare(`
          SELECT i.*
          FROM invites i
          WHERE i.token = ? AND i.status = 'pending'
        `).get(token) as any;
        if (!currentInvite) return { status: 'invalid' as const };
        if (
          currentInvite.expires_at
          && new Date(currentInvite.expires_at) < new Date()
        ) {
          return { status: 'expired' as const };
        }
        if (currentInvite.department_id) {
          const department = db.prepare(`
            SELECT id
            FROM departments
            WHERE id = ? AND company_id = ?
          `).get(currentInvite.department_id, currentInvite.company_id);
          if (!department) return { status: 'invalid_department' as const };
        }
        const existing = db.prepare(
          'SELECT id FROM users WHERE email = ?',
        ).get(currentInvite.email);
        if (existing) return { status: 'existing_user' as const };

        db.prepare(`
          INSERT INTO users (
            id, name, email, password_hash, role, company_id, department_id,
            league, approved, session_version, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'bronze', 0, 0, datetime('now'), datetime('now'))
        `).run(
          userId,
          name,
          currentInvite.email,
          passwordHash,
          currentInvite.role,
          currentInvite.company_id,
          currentInvite.department_id || null,
        );

        const accepted = db.prepare(`
          UPDATE invites
          SET status = 'accepted', accepted_at = datetime('now')
          WHERE token = ? AND status = 'pending'
        `).run(token);
        if (accepted.changes !== 1) {
          throw new Error('INVITE_STATE_CHANGED');
        }

        db.prepare(`
          INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
          VALUES (?, ?, ?, datetime('now', '+2 days'))
        `).run(nanoid(), userId, refreshTokenHash);
        return {
          status: 'accepted' as const,
          role: currentInvite.role as string,
          companyId: currentInvite.company_id as string,
        };
      });
      return acceptInvite.immediate();
    }, 'accept invite', { retryOnFailure: false });

    if (outcome.status === 'expired') {
      return NextResponse.json({ error: 'Convite expirado' }, { status: 410 });
    }
    if (outcome.status === 'existing_user') {
      return NextResponse.json(
        { error: 'Este email ja possui uma conta.' },
        { status: 409 },
      );
    }
    if (outcome.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Convite invalido ou expirado' },
        { status: 409 },
      );
    }
    const accessToken = await signAccessToken({
      userId,
      role: outcome.role,
      companyId: outcome.companyId,
      sessionVersion: 0,
    });
    const response = NextResponse.json({ success: true, message: 'Conta criada com sucesso!' });
    return setAuthCookiesOnResponse(response, accessToken, refreshToken);
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Este email já possui uma conta.' }, { status: 409 });
    }
    throw err;
  }
}

// RH — revogar convite
export const DELETE = withRole('rh')(async (_req, context) => {
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;
  const { token } = await context.params;
  await initDb();
  const db = getReadDb();

  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  const invite = db.prepare('SELECT * FROM invites WHERE token = ?').get(token) as any;

  if (!invite) return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 });
  if (invite.company_id !== user?.company_id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const wq = getWriteQueue();
  const outcome = await wq.enqueue((writeDb) => (
    runAsActiveRhActor(writeDb, userId, companyId, () => (
      writeDb.prepare(`
        UPDATE invites
        SET status = 'expired'
        WHERE token = ?
          AND company_id = ?
          AND status = 'pending'
      `).run(token, companyId).changes === 1
    ))
  ), 'revoke RH invite', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json(
      { error: 'Autorizacao do RH expirou' },
      { status: 409 },
    );
  }
  if (!outcome.value) {
    return NextResponse.json(
      { error: 'Convite nao encontrado ou ja processado' },
      { status: 409 },
    );
  }

  return NextResponse.json({ success: true });
});
