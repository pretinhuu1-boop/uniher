/**
 * GET  /api/admin/users — lista usuários admin master (role='admin')
 * POST /api/admin/users — cria novo usuário (admin master requer confirmação de senha)
 */
import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

// ─── GET — lista admin masters ────────────────────────────────────────────────

export const GET = withMasterAdmin(async (req, _context) => {
  await initDb();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  const db = getReadDb();
  const total = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' AND is_master_admin = 1 AND deleted_at IS NULL").get() as { cnt: number }).cnt;
  const users = db.prepare(`
    SELECT id, name, email, role, is_master_admin, level, points, blocked, created_at, company_id
    FROM users
    WHERE role = 'admin' AND is_master_admin = 1 AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
  return NextResponse.json({ users, total, limit, offset });
});

// ─── POST — cria novo usuário ─────────────────────────────────────────────────

const CreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100)
    .regex(/[A-Z]/, 'Senha precisa de pelo menos 1 letra maiúscula')
    .regex(/[a-z]/, 'Senha precisa de pelo menos 1 letra minúscula')
    .regex(/[0-9]/, 'Senha precisa de pelo menos 1 número')
    .regex(/[!@#$%&*]/, 'Senha precisa de 1 caractere especial (!@#$%&*)'),
  role: z.enum(['admin', 'rh', 'lideranca', 'colaboradora']).default('admin'),
  company_id: z.string().optional().nullable(),
  confirmCurrentPassword: z.string().optional(),
});

export const POST = withMasterAdmin(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { name, email, password, role, company_id, confirmCurrentPassword } = parsed.data;
  const alsoCollaborator = body.also_collaborator ? 1 : 0;
  const mustChangePw = body.mustChangePassword === false ? 0 : 1;
  const db = getReadDb();

  // Admin master exige confirmação de senha do solicitante
  if (role === 'admin') {
    if (!confirmCurrentPassword) {
      return NextResponse.json({ error: 'Confirme sua senha para criar um Admin Master' }, { status: 400 });
    }
    const actor = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(context.auth.userId) as { password_hash: string } | undefined;
    if (!actor) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    const valid = await verifyPassword(confirmCurrentPassword, actor.password_hash);
    if (!valid) return NextResponse.json({ error: 'Senha incorreta. Confirme com sua senha atual.' }, { status: 403 });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const id = nanoid();

  // Admin master nunca tem empresa vinculada
  const finalCompanyId = role === 'admin' ? null : (company_id ?? null);

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, company_id, is_master_admin, approved, level, points, streak, must_change_password, also_collaborator)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 0, 0, ?, ?)
    `).run(id, name, email, passwordHash, role, finalCompanyId, role === 'admin' ? 1 : 0, mustChangePw, alsoCollaborator);

    db.prepare(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
      VALUES (?, 'first_access_tour_completed', '0', datetime('now'))
      ON CONFLICT(user_id, pref_key) DO UPDATE SET
        pref_value = excluded.pref_value,
        updated_at = excluded.updated_at
    `).run(id);
  });

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'user_create',
    entityType: 'user',
    entityId: id,
    entityLabel: name,
    details: { email, role },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ success: true, id });
});
