import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  runAsActiveMasterAdminActor,
  runAsActiveRhActor,
} from '@/lib/security/active-rh-actor';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const SendSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  company_id: z.string().optional(),
  department_id: z.string().optional(),
  target_role: z.enum(['admin', 'rh', 'lideranca', 'colaboradora']).optional(),
  notification_type: z
    .enum(['alert', 'system', 'campaign', 'challenge', 'lesson', 'gamification'])
    .default('alert'),
});

const roleLabelMap: Record<string, string> = {
  admin: 'Admin Master',
  rh: 'RH',
  lideranca: 'Lideranca',
  colaboradora: 'Colaboradoras',
};

export const POST = withRole('admin', 'rh')(async (
  req: NextRequest,
  context,
) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados invalidos', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    title,
    message,
    company_id,
    department_id,
    target_role,
    notification_type,
  } = parsed.data;
  const isMasterAdmin = context.auth.isMasterAdmin === true;
  const actorCompanyId = context.auth.companyId || undefined;
  const sendingToGlobalAdmins = target_role === 'admin';
  if (sendingToGlobalAdmins && !isMasterAdmin) {
    return NextResponse.json(
      { error: 'Somente o Admin Master pode enviar alertas para admins globais' },
      { status: 403 },
    );
  }
  if (!isMasterAdmin && company_id && company_id !== actorCompanyId) {
    return NextResponse.json(
      { error: 'Voce so pode enviar notificacoes para a sua propria empresa' },
      { status: 403 },
    );
  }

  const normalizedCompanyId = sendingToGlobalAdmins
    ? undefined
    : (isMasterAdmin ? company_id : actorCompanyId);
  const normalizedDepartmentId = sendingToGlobalAdmins
    ? undefined
    : department_id;
  if (!sendingToGlobalAdmins && !normalizedCompanyId) {
    return NextResponse.json(
      { error: 'Empresa de destino nao encontrada para este envio' },
      { status: 400 },
    );
  }

  const where = [
    'u.approved = 1',
    'u.blocked = 0',
    'u.deleted_at IS NULL',
  ];
  const params: string[] = [];
  where.push(sendingToGlobalAdmins ? "u.role = 'admin'" : "u.role != 'admin'");
  if (normalizedCompanyId) {
    where.push('u.company_id = ?');
    params.push(normalizedCompanyId);
  }
  if (normalizedDepartmentId) {
    where.push('u.department_id = ?');
    params.push(normalizedDepartmentId);
  }
  if (target_role && !sendingToGlobalAdmins) {
    where.push('u.role = ?');
    params.push(target_role);
  }

  const alertId = nanoid();
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => {
    const writeAlert = () => {
      const company = normalizedCompanyId
        ? db.prepare(`
            SELECT name
            FROM companies
            WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
          `).get(normalizedCompanyId) as { name: string } | undefined
        : undefined;
      if (normalizedCompanyId && !company) {
        return { status: 'invalid_scope' as const };
      }

      const department = normalizedDepartmentId
        ? db.prepare(`
            SELECT name
            FROM departments
            WHERE id = ? AND company_id = ?
          `).get(normalizedDepartmentId, normalizedCompanyId) as
            | { name: string }
            | undefined
        : undefined;
      if (normalizedDepartmentId && !department) {
        return { status: 'invalid_scope' as const };
      }

      const users = db.prepare(`
        SELECT u.id
        FROM users u
        WHERE ${where.join(' AND ')}
      `).all(...params) as { id: string }[];
      const audienceParts = sendingToGlobalAdmins
        ? ['Admin Master global']
        : [
            department?.name ? `Departamento ${department.name}` : '',
            company?.name ? `Empresa ${company.name}` : '',
            target_role
              ? roleLabelMap[target_role] ?? target_role
              : 'Todos os funcionarios',
          ].filter(Boolean);
      const audienceLabel = audienceParts.join(' - ');

      const notification = db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, message)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const user of users) {
        notification.run(
          nanoid(),
          user.id,
          notification_type,
          title,
          message,
        );
      }

      try {
        db.prepare(`
          INSERT INTO admin_alerts (
            id, company_id, department_id, target_role, notification_type,
            audience_label, sent_by, title, message, recipients_count
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          alertId,
          normalizedCompanyId ?? null,
          normalizedDepartmentId ?? null,
          target_role ?? null,
          notification_type,
          audienceLabel,
          context.auth.userId,
          title,
          message,
          users.length,
        );
      } catch {
        // Legacy databases may not have the alert history table yet.
      }

      return {
        status: 'sent' as const,
        recipients: users.length,
        audienceLabel,
      };
    };

    return isMasterAdmin
      ? runAsActiveMasterAdminActor(db, context.auth.userId, writeAlert)
      : runAsActiveRhActor(
          db,
          context.auth.userId,
          actorCompanyId ?? '',
          writeAlert,
        );
  }, 'send privileged alert', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json(
      { error: 'Autorizacao para envio expirou' },
      { status: 409 },
    );
  }
  if (outcome.value.status === 'invalid_scope') {
    return NextResponse.json(
      { error: 'Empresa ou departamento de destino foi alterado' },
      { status: 409 },
    );
  }
  return NextResponse.json({
    success: true,
    recipients: outcome.value.recipients,
    audienceLabel: outcome.value.audienceLabel,
  });
});

export const GET = withRole('admin', 'rh')(async (
  _req: NextRequest,
  context,
) => {
  await initDb();
  const db = getReadDb();
  const isMasterAdmin = context.auth.isMasterAdmin === true;

  try {
    const whereClause = isMasterAdmin ? '' : 'WHERE a.company_id = ?';
    const alerts = db.prepare(`
      SELECT
        a.*,
        u.name as sent_by_name,
        c.name as company_name,
        d.name as department_name
      FROM admin_alerts a
      LEFT JOIN users u ON u.id = a.sent_by
      LEFT JOIN companies c ON c.id = a.company_id
      LEFT JOIN departments d ON d.id = a.department_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT 50
    `).all(
      ...(isMasterAdmin ? [] : [context.auth.companyId]),
    ) as unknown[];
    return NextResponse.json({ alerts });
  } catch {
    return NextResponse.json({ alerts: [] });
  }
});
