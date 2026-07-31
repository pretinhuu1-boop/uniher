import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';
import { runAsActiveMasterAdminActor } from '@/lib/security/active-rh-actor';

const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('block') }),
  z.object({ action: z.literal('unblock') }),
  z.object({
    action: z.literal('update'),
    name: z.string().min(1).max(120).optional(),
    trade_name: z.string().max(120).optional().nullable(),
    cnpj: z.string().max(20).optional().nullable(),
    sector: z.string().max(80).optional().nullable(),
    plan: z.enum(['trial', 'basic', 'pro', 'enterprise']).optional(),
    contact_name: z.string().max(100).optional().nullable(),
    contact_email: z.string().email().max(120).optional().nullable().or(z.literal('')),
    contact_phone: z.string().max(20).optional().nullable(),
    logo_url: z.string().url().optional().nullable(),
    primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable().or(z.literal('')),
    secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable().or(z.literal('')),
  }),
]);

interface CompanyLabel {
  name: string;
  trade_name: string | null;
}

function expiredAuthorizationResponse() {
  return NextResponse.json(
    { error: 'Autorizacao administrativa expirou' },
    { status: 409 },
  );
}

function changedCompanyResponse() {
  return NextResponse.json(
    { error: 'Empresa nao encontrada ou alterada' },
    { status: 409 },
  );
}

export const GET = withMasterAdmin(async (_req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const db = getReadDb();
  const company = db.prepare(
    'SELECT * FROM companies WHERE id = ? AND deleted_at IS NULL',
  ).get(id);
  if (!company) {
    return NextResponse.json({ error: 'Nao encontrada' }, { status: 404 });
  }
  return NextResponse.json({ company });
});

export const PATCH = withMasterAdmin(async (req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  const actorId = context.auth.userId;
  const ip = req.headers.get('x-forwarded-for') ?? undefined;
  const wq = getWriteQueue();

  if (parsed.data.action === 'block' || parsed.data.action === 'unblock') {
    const isActive = parsed.data.action === 'unblock' ? 1 : 0;
    const outcome = await wq.enqueue((db) => (
      runAsActiveMasterAdminActor(db, actorId, () => {
        const company = db.prepare(`
          SELECT name, trade_name
          FROM companies
          WHERE id = ? AND deleted_at IS NULL
        `).get(id) as CompanyLabel | undefined;
        if (!company) return null;

        const updated = db.prepare(`
          UPDATE companies
          SET is_active = ?, updated_at = datetime('now')
          WHERE id = ? AND deleted_at IS NULL
        `).run(isActive, id);
        return updated.changes === 1 ? company : null;
      })
    ), `${parsed.data.action} company as Master Admin`, { retryOnFailure: false });

    if (!outcome.authorized) return expiredAuthorizationResponse();
    if (!outcome.value) return changedCompanyResponse();

    await logAudit({
      actorId,
      actorEmail: actorId,
      actorRole: context.auth.role,
      action: parsed.data.action === 'block'
        ? 'company_block'
        : 'company_unblock',
      entityType: 'company',
      entityId: id,
      entityLabel: outcome.value.trade_name ?? outcome.value.name,
      ip,
    });
    return NextResponse.json({ success: true });
  }

  const data = parsed.data;
  const fields: string[] = [];
  const values: unknown[] = [];
  const keys = [
    'name',
    'trade_name',
    'cnpj',
    'sector',
    'plan',
    'contact_name',
    'contact_email',
    'contact_phone',
    'logo_url',
    'primary_color',
    'secondary_color',
  ] as const;
  for (const key of keys) {
    if (key in data && (data as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push((data as Record<string, unknown>)[key] ?? null);
    }
  }
  if (fields.length === 0) {
    return NextResponse.json({ error: 'Nenhum campo' }, { status: 400 });
  }

  const outcome = await wq.enqueue((db) => (
    runAsActiveMasterAdminActor(db, actorId, () => {
      const company = db.prepare(`
        SELECT name, trade_name
        FROM companies
        WHERE id = ? AND deleted_at IS NULL
      `).get(id) as CompanyLabel | undefined;
      if (!company) return null;

      const updated = db.prepare(`
        UPDATE companies
        SET ${fields.join(', ')}, updated_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL
      `).run(...values, id);
      return updated.changes === 1 ? company : null;
    })
  ), 'update company as Master Admin', { retryOnFailure: false });

  if (!outcome.authorized) return expiredAuthorizationResponse();
  if (!outcome.value) return changedCompanyResponse();

  await logAudit({
    actorId,
    actorEmail: actorId,
    actorRole: context.auth.role,
    action: 'company_edit',
    entityType: 'company',
    entityId: id,
    entityLabel: outcome.value.trade_name ?? outcome.value.name,
    details: Object.fromEntries(
      keys
        .filter((key) => (
          key in data
          && (data as Record<string, unknown>)[key] !== undefined
        ))
        .map((key) => [key, (data as Record<string, unknown>)[key]]),
    ),
    ip,
  });
  return NextResponse.json({ success: true });
});

export const DELETE = withMasterAdmin(async (req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const actorId = context.auth.userId;
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveMasterAdminActor(db, actorId, () => {
      const company = db.prepare(`
        SELECT name, trade_name
        FROM companies
        WHERE id = ? AND deleted_at IS NULL
      `).get(id) as CompanyLabel | undefined;
      if (!company) return null;

      const deleted = db.prepare(`
        UPDATE companies
        SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL
      `).run(id);
      if (deleted.changes !== 1) return null;

      db.prepare(`
        UPDATE users
        SET deleted_at = datetime('now'), updated_at = datetime('now')
        WHERE company_id = ? AND deleted_at IS NULL
      `).run(id);
      return company;
    })
  ), 'delete company as Master Admin', { retryOnFailure: false });

  if (!outcome.authorized) return expiredAuthorizationResponse();
  if (!outcome.value) return changedCompanyResponse();

  await logAudit({
    actorId,
    actorEmail: actorId,
    actorRole: context.auth.role,
    action: 'company_delete',
    entityType: 'company',
    entityId: id,
    entityLabel: outcome.value.trade_name ?? outcome.value.name,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });
  return NextResponse.json({ success: true });
});
