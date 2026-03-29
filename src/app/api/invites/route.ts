/**
 * GET  /api/invites  — listar convites da empresa (RH)
 * POST /api/invites  — criar convite
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { sendEmailAsync } from '@/lib/mail';
import { inviteEmailHtml } from '@/lib/mail/templates';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { checkAdminRateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/audit';

const MAX_EXPIRY_DAYS = 3;

const CreateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email(),
  role: z.enum(['rh', 'lideranca', 'colaboradora']).default('colaboradora'),
  department_id: z.string().optional().nullable(),
  expires_at: z.string().optional(),
});

export const GET = withRole('rh', 'lideranca')(async (_req, context) => {
  const userId = context.auth.userId;
  await initDb();
  const db = getReadDb();
  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ invites: [] });

  const invites = db.prepare(`
    SELECT i.*, u.name as invited_by_name, d.name as department_name
    FROM invites i
    LEFT JOIN users u ON u.id = i.invited_by
    LEFT JOIN departments d ON d.id = i.department_id
    WHERE i.company_id = ?
    ORDER BY i.created_at DESC
    LIMIT 100
  `).all(user.company_id) as any[];

  return NextResponse.json({ invites });
});

export const POST = withRole('rh')(async (req, context) => {
  await checkAdminRateLimit(req);
  const userId = context.auth.userId;
  await initDb();
  const db = getReadDb();
  const user = db.prepare('SELECT company_id, name FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { name: inviteeName, email, role, department_id } = parsed.data;

  // RH cannot invite other RH users — only admin can
  if (context.auth.role === 'rh' && role === 'rh') {
    return NextResponse.json({ error: 'RH não pode convidar outros usuários RH' }, { status: 403 });
  }

  // Check if already invited and pending
  const existing = db.prepare("SELECT id FROM invites WHERE email = ? AND company_id = ? AND status = 'pending'").get(email, user.company_id);
  if (existing) return NextResponse.json({ error: 'Já existe um convite pendente para este email' }, { status: 409 });

  // Check if already registered
  const registered = db.prepare('SELECT id FROM users WHERE email = ? AND company_id = ?').get(email, user.company_id);
  if (registered) return NextResponse.json({ error: 'Este email já está cadastrado na empresa' }, { status: 409 });

  const token = nanoid(32);
  const id = nanoid();

  // Validate and compute expiry
  const now = new Date();
  const maxDate = new Date(now.getTime() + MAX_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  let expiresAt: string;
  if (parsed.data.expires_at) {
    const requested = new Date(parsed.data.expires_at);
    if (isNaN(requested.getTime()) || requested <= now) {
      return NextResponse.json({ error: 'Data de expiração inválida ou já passou' }, { status: 422 });
    }
    if (requested > maxDate) {
      return NextResponse.json({ error: `O prazo máximo é de ${MAX_EXPIRY_DAYS} dias` }, { status: 422 });
    }
    expiresAt = requested.toISOString();
  } else {
    // Default: 1 day
    expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`
      INSERT INTO invites (id, company_id, email, role, department_id, token, status, invited_by, expires_at, name)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).run(id, user.company_id, email, role, department_id || null, token, userId, expiresAt, inviteeName || null);
  });

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

  // Fetch company name for the email
  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(user.company_id) as { name: string } | undefined;
  const inviterName = user.name || 'Equipe UniHER';
  const companyName = company?.name || 'sua empresa';

  // Audit log for invite creation
  logAudit({
    actorId: userId,
    actorEmail: user.name || '',
    actorRole: context.auth.role,
    action: 'invite_sent',
    entityType: 'invite',
    entityId: id,
    entityLabel: email,
    details: { role, department_id, company_id: user.company_id },
    ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
  });

  // Send invite email (fire-and-forget)
  sendEmailAsync({
    to: email,
    subject: `${inviterName} convidou você para a UniHER`,
    html: inviteEmailHtml({
      inviterName,
      companyName,
      inviteUrl,
      role,
      expiresInDays: MAX_EXPIRY_DAYS,
    }),
  });

  return NextResponse.json({ success: true, inviteUrl, token, email });
});
