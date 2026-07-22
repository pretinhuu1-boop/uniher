import { NextRequest, NextResponse } from 'next/server';

import { withAuth } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { AppError, handleApiError } from '@/lib/errors';

type CollaboratorActorRow = {
  company_id: string | null;
  role: string;
  also_collaborator: number;
};

type CollaboratorCompanyRow = {
  id: string;
  name: string;
  trade_name: string | null;
  logo_url: string | null;
};

export const GET = withAuth(async (_req: NextRequest, context) => {
  try {
    await initDb();
    const db = getReadDb();
    const readIdentity = db.transaction(() => {
      const actor = db.prepare(`
        SELECT company_id, role, COALESCE(also_collaborator, 0) AS also_collaborator
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
          AND COALESCE(blocked, 0) = 0
          AND COALESCE(approved, 0) = 1
      `).get(context.auth.userId) as CollaboratorActorRow | undefined;
      const hasCapability = actor?.role === 'colaboradora' || actor?.also_collaborator === 1;

      if (
        !actor
        || !hasCapability
        || actor.role !== context.auth.role
        || !actor.company_id
        || actor.company_id !== context.auth.companyId
      ) {
        throw new AppError(
          'Permissao insuficiente',
          403,
          'COLLABORATOR_CAPABILITY_REQUIRED',
        );
      }

      const company = db.prepare(`
        SELECT id, name, trade_name, logo_url
        FROM companies
        WHERE id = ?
          AND COALESCE(is_active, 0) = 1
          AND deleted_at IS NULL
      `).get(actor.company_id) as CollaboratorCompanyRow | undefined;

      if (!company) {
        throw new AppError('Empresa nao encontrada', 404, 'COMPANY_NOT_FOUND');
      }

      return company;
    });

    return NextResponse.json({ company: readIdentity.deferred() });
  } catch (error) {
    return handleApiError(error);
  }
});
