/**
 * GET /api/departments — list departments for the current user's company
 * POST /api/departments — create a new department
 */
import { NextResponse } from 'next/server';
import { withAuth, withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  runAsActiveCompanyActor,
  runAsActiveRhActor,
} from '@/lib/security/active-rh-actor';
import { nanoid } from 'nanoid';

export const GET = withAuth(async (req, context) => {
  const userId = context.auth.userId;
  await initDb();
  const db = getReadDb();
  const url = new URL(req.url);
  const requestedCompanyId = url.searchParams.get('company_id');

  const user = db.prepare('SELECT company_id FROM users WHERE id = ?').get(userId) as any;
  const canReadAnyCompany = context.auth.isMasterAdmin === true || (context.auth.isMasterAdmin === undefined && context.auth.role === 'admin');
  const companyId = canReadAnyCompany && requestedCompanyId
    ? requestedCompanyId
    : user?.company_id;
  if (!companyId) return NextResponse.json({ departments: [] });

  const departments = db.prepare(`
    SELECT id, name FROM departments
    WHERE company_id = ?
    ORDER BY name ASC
  `).all(companyId) as any[];

  return NextResponse.json({ departments });
});

export const POST = withRole('admin', 'rh')(async (req, context) => {
  await initDb();

  const body = await req.json();
  // Sanitize: remove HTML tags
  const name = (body.name || '').trim().replace(/<[^>]*>/g, '').trim();
  if (!name) {
    return NextResponse.json({ error: 'Nome do setor é obrigatório' }, { status: 400 });
  }

  const companyId = context.auth.companyId;
  if (!companyId) {
    return NextResponse.json({ error: 'Usuário não vinculado a empresa' }, { status: 400 });
  }

  const id = nanoid();
  const wq = getWriteQueue();
  const outcome = await wq.enqueue((db) => {
    const operation = () => {
      const existing = db.prepare(`
        SELECT id
        FROM departments
        WHERE company_id = ? AND name = ?
      `).get(companyId, name);
      if (existing) return { status: 'duplicate' as const };

      db.prepare(`
        INSERT INTO departments (id, company_id, name)
        VALUES (?, ?, ?)
      `).run(id, companyId, name);
      return { status: 'created' as const };
    };

    return context.auth.role === 'rh'
      ? runAsActiveRhActor(db, context.auth.userId, companyId, operation)
      : runAsActiveCompanyActor(db, context.auth.userId, companyId, 'admin', operation);
  }, 'create legacy managed department', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização de gestão expirou' }, { status: 409 });
  }
  if (outcome.value.status === 'duplicate') {
    return NextResponse.json({ error: 'Setor já existe' }, { status: 409 });
  }

  return NextResponse.json({ id, name }, { status: 201 });
});
