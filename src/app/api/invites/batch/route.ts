/**
 * POST /api/invites/batch — bulk invite multiple emails
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkAdminRateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/audit';
import { sendEmailAsync } from '@/lib/mail';
import { inviteEmailHtml } from '@/lib/mail/templates';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { getPublicAppOrigin } from '@/lib/security/public-app-origin';

const MAX_BATCH_SIZE = 50;
const MAX_EXPIRY_DAYS = 3;

const BatchSchema = z.object({
  emails: z.array(z.string().email('Email inválido')).min(1).max(MAX_BATCH_SIZE, `Máximo de ${MAX_BATCH_SIZE} convites por vez`),
  role: z.enum(['lideranca', 'colaboradora']).default('colaboradora'),
  department_id: z.string().optional().nullable(),
});

export const POST = withRole('rh')(async (req, context) => {
  await checkAdminRateLimit(req);
  await initDb();

  const userId = context.auth.userId;
  const db = getReadDb();
  const user = db.prepare('SELECT company_id, name FROM users WHERE id = ?').get(userId) as any;
  if (!user?.company_id) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = BatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { emails, role, department_id } = parsed.data;
  const appOrigin = getPublicAppOrigin();

  // Validate department if provided
  if (department_id) {
    const dept = db.prepare('SELECT id FROM departments WHERE id = ? AND company_id = ?').get(department_id, user.company_id);
    if (!dept) return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 });
  }

  const company = db.prepare('SELECT name FROM companies WHERE id = ?').get(user.company_id) as { name: string } | undefined;
  const inviterName = user.name || 'Equipe UniHER';
  const companyName = company?.name || 'sua empresa';
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const results: { email: string; success: boolean; error?: string }[] = [];
  const wq = getWriteQueue();

  // Deduplicate emails
  const uniqueEmails = [...new Set(emails.map(e => e.toLowerCase().trim()))];

  for (const email of uniqueEmails) {
    try {
      const token = nanoid(32);
      const id = nanoid();
      const outcome = await wq.enqueue((writeDb) => {
        const createInvite = writeDb.transaction(() => {
          const activeActor = writeDb.prepare(`
            SELECT u.id
            FROM users u
            JOIN companies c ON c.id = u.company_id
            WHERE u.id = ?
              AND u.company_id = ?
              AND u.role = 'rh'
              AND COALESCE(u.approved, 1) = 1
              AND COALESCE(u.blocked, 0) = 0
              AND u.deleted_at IS NULL
              AND COALESCE(c.is_active, 1) = 1
              AND c.deleted_at IS NULL
          `).get(userId, user.company_id);
          if (!activeActor) return 'invalid_actor';

          if (department_id) {
            const department = writeDb.prepare(`
              SELECT id
              FROM departments
              WHERE id = ? AND company_id = ?
            `).get(department_id, user.company_id);
            if (!department) return 'invalid_department';
          }

          const existing = writeDb.prepare(`
            SELECT id
            FROM invites
            WHERE email = ? AND company_id = ? AND status = 'pending'
          `).get(email, user.company_id);
          if (existing) return 'pending';

          const registered = writeDb.prepare(
            'SELECT id FROM users WHERE email = ?',
          ).get(email);
          if (registered) return 'registered';

          writeDb.prepare(`
            INSERT INTO invites (
              id, company_id, email, role, department_id, token, status,
              invited_by, expires_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
          `).run(
            id,
            user.company_id,
            email,
            role,
            department_id || null,
            token,
            userId,
            expiresAt,
          );
          return 'created';
        });
        return createInvite.immediate();
      }, 'create batch invite', { retryOnFailure: false });

      if (outcome === 'pending') {
        results.push({ email, success: false, error: 'Convite pendente já existe' });
        continue;
      }
      if (outcome === 'registered') {
        results.push({ email, success: false, error: 'Já cadastrado na empresa' });
        continue;
      }
      if (outcome !== 'created') {
        results.push({ email, success: false, error: 'Empresa ou departamento inválido' });
        continue;
      }

      const inviteUrl = `${appOrigin}/invite/${token}`;

      // Send email (fire-and-forget)
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

      results.push({ email, success: true });
    } catch (err) {
      results.push({ email, success: false, error: 'Erro interno' });
    }
  }

  const successCount = results.filter(r => r.success).length;

  await logAudit({
    actorId: userId,
    actorEmail: user.name || '',
    actorRole: 'rh',
    action: 'invite_sent',
    entityType: 'invite_batch',
    entityId: nanoid(),
    entityLabel: `${successCount}/${uniqueEmails.length} convites`,
    details: { role, department_id, total: uniqueEmails.length, success: successCount },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({
    success: true,
    total: uniqueEmails.length,
    successCount,
    errorCount: uniqueEmails.length - successCount,
    results,
  });
});
