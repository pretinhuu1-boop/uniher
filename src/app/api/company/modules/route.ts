import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth, withMasterAdmin } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import {
  canAdminSetCompanyModuleState,
  createCompanyModulesStore,
  getCompanyModuleDefinition,
  isCompanyModuleSlug,
  isCompanyModuleState,
  resolveCompanyModuleNavigationRows,
} from '@/lib/modules/company-modules';
import { handleApiError } from '@/lib/errors';
import type {
  CompanyModuleNavigationRecord,
  CompanyModuleRecord,
  CompanyModuleSlug,
  CompanyModuleState,
} from '@/types/modules';

const patchSchema = z.object({
  company_id: z.string().min(1),
  module_slug: z.custom<CompanyModuleSlug>(
    (value) => typeof value === 'string' && isCompanyModuleSlug(value),
    'Modulo invalido',
  ),
  module_state: z.custom<CompanyModuleState>(
    (value) => typeof value === 'string' && isCompanyModuleState(value),
    'Estado invalido',
  ),
});

function auditSnapshot(module: Pick<CompanyModuleRecord, 'module_state' | 'visible'>) {
  return {
    module_state: module.module_state,
    visible: module.visible,
  };
}

export const GET = withAuth(async (_req: NextRequest, { auth }) => {
  try {
    await initDb();

    if (!auth.companyId) {
      return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 });
    }

    const explicitModules = createCompanyModulesStore(getReadDb())
      .listCompanyModules(auth.companyId);
    const modules: CompanyModuleNavigationRecord[] = resolveCompanyModuleNavigationRows(explicitModules);

    return NextResponse.json({ modules });
  } catch (error) {
    return handleApiError(error);
  }
});

export const PATCH = withMasterAdmin(async (req: NextRequest, { auth }) => {
  try {
    await initDb();

    const body = await req.json().catch(() => ({}));
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados invalidos', details: parsed.error.flatten() }, { status: 400 });
    }

    const { company_id: companyId, module_slug: moduleSlug, module_state: moduleState } = parsed.data;
    if (!canAdminSetCompanyModuleState(moduleSlug, moduleState)) {
      return NextResponse.json(
        { error: 'Modulo sensivel depende de contrato ou fonte aprovada para ser habilitado' },
        { status: 422 },
      );
    }

    const readDb = getReadDb();
    const company = readDb.prepare('SELECT id, name, trade_name FROM companies WHERE id = ?')
      .get(companyId) as { id: string; name?: string | null; trade_name?: string | null } | undefined;
    if (!company) {
      return NextResponse.json({ error: 'Empresa nao encontrada' }, { status: 404 });
    }

    const readStore = createCompanyModulesStore(readDb);
    const existing = readStore.getCompanyModule(companyId, moduleSlug);
    const definition = getCompanyModuleDefinition(moduleSlug);
    const oldValue = auditSnapshot(existing ?? {
      module_state: definition.defaultState,
      visible: definition.visibleByDefault ? 1 : 0,
    });

    let updated: CompanyModuleRecord | null = null;
    await getWriteQueue().enqueue((db) => {
      updated = createCompanyModulesStore(db).upsertCompanyModule({
        companyId,
        moduleSlug,
        moduleState,
        visible: oldValue.visible === 1,
        updatedBy: auth.userId,
      });
    });
    if (!updated) throw new Error('Company module was not persisted');

    const newValue = auditSnapshot(updated);
    await logAudit({
      actorId: auth.userId,
      actorEmail: auth.userId,
      actorRole: auth.role,
      action: 'company_module_update',
      entityType: 'company_module',
      entityId: `${companyId}:${moduleSlug}`,
      entityLabel: `${company.trade_name ?? company.name ?? companyId} / ${definition.label}`,
      details: {
        company_id: companyId,
        module_slug: moduleSlug,
        old: oldValue,
        new: newValue,
      },
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    });

    return NextResponse.json({ module: updated });
  } catch (error) {
    return handleApiError(error);
  }
});
