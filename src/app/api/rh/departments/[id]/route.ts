/**
 * PATCH  /api/rh/departments/[id] — update department
 * DELETE /api/rh/departments/[id] — delete department
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/audit';
import { z } from 'zod';

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const PATCH = withRole('rh')(async (req: NextRequest, context) => {
  await checkWriteRateLimit(req);
  await initDb();

  const params = await context.params;
  const deptId = params.id;
  const companyId = context.auth.companyId;
  if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const db = getReadDb();
  const dept = db.prepare('SELECT id, name FROM departments WHERE id = ? AND company_id = ?').get(deptId, companyId) as any;
  if (!dept) return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { name, color } = parsed.data;
  if (!name && !color) return NextResponse.json({ error: 'Nenhuma alteração fornecida' }, { status: 422 });

  // Check duplicate name
  if (name) {
    const existing = db.prepare('SELECT id FROM departments WHERE company_id = ? AND LOWER(name) = LOWER(?) AND id != ?').get(companyId, name, deptId);
    if (existing) return NextResponse.json({ error: 'Já existe um departamento com este nome' }, { status: 409 });
  }

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    const sets: string[] = [];
    const vals: any[] = [];
    if (name) { sets.push('name = ?'); vals.push(name); }
    if (color) { sets.push('color = ?'); vals.push(color); }
    vals.push(deptId);
    db.prepare(`UPDATE departments SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  });

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: 'rh',
    action: 'company_edit',
    entityType: 'department',
    entityId: deptId,
    entityLabel: name || dept.name,
    details: { action: 'update_department', name, color },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ success: true });
});

export const DELETE = withRole('rh')(async (req: NextRequest, context) => {
  await checkWriteRateLimit(req);
  await initDb();

  const params = await context.params;
  const deptId = params.id;
  const companyId = context.auth.companyId;
  if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const db = getReadDb();
  const dept = db.prepare('SELECT id, name FROM departments WHERE id = ? AND company_id = ?').get(deptId, companyId) as any;
  if (!dept) return NextResponse.json({ error: 'Departamento não encontrado' }, { status: 404 });

  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    // Remove department reference from users first
    db.prepare('UPDATE users SET department_id = NULL WHERE department_id = ?').run(deptId);
    db.prepare('DELETE FROM departments WHERE id = ?').run(deptId);
  });

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: 'rh',
    action: 'company_edit',
    entityType: 'department',
    entityId: deptId,
    entityLabel: dept.name,
    details: { action: 'delete_department' },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ success: true });
});
