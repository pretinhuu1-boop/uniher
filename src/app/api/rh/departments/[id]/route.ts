/**
 * PATCH  /api/rh/departments/[id] — update department
 * DELETE /api/rh/departments/[id] — delete department
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';
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
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { name, color } = parsed.data;
  if (!name && !color) return NextResponse.json({ error: 'Nenhuma alteração fornecida' }, { status: 422 });

  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, context.auth.userId, companyId, () => {
      const department = db.prepare(`
        SELECT id, name
        FROM departments
        WHERE id = ? AND company_id = ?
      `).get(deptId, companyId) as { id: string; name: string } | undefined;
      if (!department) return { status: 'missing' as const };

      if (name) {
        const existing = db.prepare(`
          SELECT id
          FROM departments
          WHERE company_id = ? AND LOWER(name) = LOWER(?) AND id != ?
        `).get(companyId, name, deptId);
        if (existing) return { status: 'duplicate' as const };
      }

      const sets: string[] = [];
      const values: unknown[] = [];
      if (name) { sets.push('name = ?'); values.push(name); }
      if (color) { sets.push('color = ?'); values.push(color); }
      const updated = db.prepare(`
        UPDATE departments
        SET ${sets.join(', ')}
        WHERE id = ? AND company_id = ?
      `).run(...values, deptId, companyId);
      return updated.changes === 1
        ? { status: 'updated' as const, department }
        : { status: 'missing' as const };
    })
  ), 'update RH department', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
  }
  if (outcome.value.status === 'duplicate') {
    return NextResponse.json({ error: 'Já existe um departamento com este nome' }, { status: 409 });
  }
  if (outcome.value.status === 'missing') {
    return NextResponse.json({ error: 'Departamento não encontrado ou alterado' }, { status: 409 });
  }

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: 'rh',
    action: 'company_edit',
    entityType: 'department',
    entityId: deptId,
    entityLabel: name || outcome.value.department.name,
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
  if (!companyId || context.auth.role !== 'rh') {
    return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
  }

  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => (
    runAsActiveRhActor(db, context.auth.userId, companyId, () => {
      const department = db.prepare(`
        SELECT id, name
        FROM departments
        WHERE id = ? AND company_id = ?
      `).get(deptId, companyId) as { id: string; name: string } | undefined;
      if (!department) return null;

      db.prepare(`
        UPDATE users
        SET department_id = NULL
        WHERE department_id = ? AND company_id = ?
      `).run(deptId, companyId);
      const deleted = db.prepare(`
        DELETE FROM departments
        WHERE id = ? AND company_id = ?
      `).run(deptId, companyId);
      return deleted.changes === 1 ? department : null;
    })
  ), 'delete RH department', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
  }
  if (!outcome.value) {
    return NextResponse.json({ error: 'Departamento não encontrado ou alterado' }, { status: 409 });
  }

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: 'rh',
    action: 'company_edit',
    entityType: 'department',
    entityId: deptId,
    entityLabel: outcome.value.name,
    details: { action: 'delete_department' },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ success: true });
});
