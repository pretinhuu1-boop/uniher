/**
 * GET  /api/rh/departments — list departments for RH's company (with user count)
 * POST /api/rh/departments — create department
 */
import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkWriteRateLimit, checkReadRateLimit } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/audit';
import { nanoid } from 'nanoid';
import { z } from 'zod';

export const GET = withRole('rh')(async (req, context) => {
  await checkReadRateLimit(req);
  await initDb();
  const db = getReadDb();
  const companyId = context.auth.companyId;
  if (!companyId) return NextResponse.json({ departments: [] });

  const departments = db.prepare(`
    SELECT d.id, d.name, d.color, d.created_at,
      COUNT(u.id) as user_count
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.company_id = d.company_id AND u.deleted_at IS NULL
    WHERE d.company_id = ?
    GROUP BY d.id
    ORDER BY d.name ASC
  `).all(companyId) as any[];

  return NextResponse.json({ departments });
});

const CreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').default('#3E7D5A'),
});

export const POST = withRole('rh')(async (req, context) => {
  await checkWriteRateLimit(req);
  await initDb();

  const companyId = context.auth.companyId;
  if (!companyId) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });

  const { name, color } = parsed.data;
  const db = getReadDb();

  // Check if department name already exists in company
  const existing = db.prepare('SELECT id FROM departments WHERE company_id = ? AND LOWER(name) = LOWER(?)').get(companyId, name);
  if (existing) return NextResponse.json({ error: 'Já existe um departamento com este nome' }, { status: 409 });

  const id = nanoid();
  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare('INSERT INTO departments (id, company_id, name, color) VALUES (?, ?, ?, ?)').run(id, companyId, name, color);
  });

  await logAudit({
    actorId: context.auth.userId,
    actorEmail: context.auth.userId,
    actorRole: 'rh',
    action: 'company_edit',
    entityType: 'department',
    entityId: id,
    entityLabel: name,
    details: { action: 'create_department', color },
    ip: req.headers.get('x-forwarded-for') ?? undefined,
  });

  return NextResponse.json({ success: true, id, name, color });
});
