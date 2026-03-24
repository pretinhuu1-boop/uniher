/**
 * GET    /api/admin/companies/[id]        — company detail
 * PATCH  /api/admin/companies/[id]        — block | unblock | update
 * DELETE /api/admin/companies/[id]        — remove company (cascades)
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const PatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('block') }),
  z.object({ action: z.literal('unblock') }),
  z.object({
    action: z.literal('update'),
    name: z.string().min(1).max(120).optional(),
    trade_name: z.string().max(120).optional().nullable(),
    sector: z.string().max(80).optional().nullable(),
    plan: z.enum(['trial', 'pro', 'enterprise']).optional(),
    contact_name: z.string().max(100).optional().nullable(),
    contact_email: z.string().email().optional().nullable(),
    contact_phone: z.string().max(20).optional().nullable(),
    logo_url: z.string().url().optional().nullable(),
    primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
    secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  }),
]);

export const GET = withRole('admin')(async (_req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const db = getReadDb();
  const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
  if (!company) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 });
  return NextResponse.json({ company });
});

export const PATCH = withRole('admin')(async (req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const wq = getWriteQueue();

  if (parsed.data.action === 'block') {
    const db2 = getReadDb();
    const company = db2.prepare('SELECT name, trade_name FROM companies WHERE id = ?').get(id) as { name: string; trade_name: string | null } | undefined;
    await wq.enqueue((db) => {
      db.prepare("UPDATE companies SET is_active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    });
    await logAudit({
      actorId: context.auth.userId,
      actorEmail: context.auth.userId,
      actorRole: context.auth.role,
      action: 'company_block',
      entityType: 'company',
      entityId: id,
      entityLabel: company?.trade_name ?? company?.name ?? id,
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    });
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === 'unblock') {
    const db2 = getReadDb();
    const company = db2.prepare('SELECT name, trade_name FROM companies WHERE id = ?').get(id) as { name: string; trade_name: string | null } | undefined;
    await wq.enqueue((db) => {
      db.prepare("UPDATE companies SET is_active = 1, updated_at = datetime('now') WHERE id = ?").run(id);
    });
    await logAudit({
      actorId: context.auth.userId,
      actorEmail: context.auth.userId,
      actorRole: context.auth.role,
      action: 'company_unblock',
      entityType: 'company',
      entityId: id,
      entityLabel: company?.trade_name ?? company?.name ?? id,
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    });
    return NextResponse.json({ success: true });
  }

  // action === 'update'
  const d = parsed.data;
  const fields: string[] = [];
  const values: unknown[] = [];
  const keys = ['name','trade_name','sector','plan','contact_name','contact_email','contact_phone','logo_url','primary_color','secondary_color'] as const;
  for (const k of keys) {
    if (k in d && (d as Record<string, unknown>)[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push((d as Record<string, unknown>)[k] ?? null);
    }
  }
  if (!fields.length) return NextResponse.json({ error: 'Nenhum campo' }, { status: 400 });

  const db2 = getReadDb();
  const companyForEdit = db2.prepare('SELECT name, trade_name FROM companies WHERE id = ?').get(id) as { name: string; trade_name: string | null } | undefined;

  await wq.enqueue((db) => {
    db.prepare(`UPDATE companies SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  });
  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'company_edit',
    entityType: 'company',
    entityId: id,
    entityLabel: companyForEdit?.trade_name ?? companyForEdit?.name ?? id,
    details: Object.fromEntries(keys.filter(k => k in d && (d as Record<string, unknown>)[k] !== undefined).map(k => [k, (d as Record<string, unknown>)[k]])),
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });
  return NextResponse.json({ success: true });
});

export const DELETE = withRole('admin')(async (req: NextRequest, context) => {
  await initDb();
  const { id } = await context.params;
  const db2 = getReadDb();
  const company = db2.prepare('SELECT name, trade_name FROM companies WHERE id = ? AND deleted_at IS NULL').get(id) as { name: string; trade_name: string | null } | undefined;
  if (!company) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare("UPDATE companies SET deleted_at = datetime('now') WHERE id = ?").run(id);
    db.prepare("UPDATE users SET deleted_at = datetime('now') WHERE company_id = ?").run(id);
  });
  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: context.auth.role,
    action: 'company_delete',
    entityType: 'company',
    entityId: id,
    entityLabel: company.trade_name ?? company.name,
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });
  return NextResponse.json({ success: true });
});
