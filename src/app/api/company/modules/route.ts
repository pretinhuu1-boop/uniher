import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { getReadDb } from '@/lib/db';
import { createCompanyModulesStore, resolveCompanyModuleNavigationRows } from '@/lib/modules/company-modules';
import { handleApiError } from '@/lib/errors';
import type { CompanyModuleNavigationRecord } from '@/types/modules';

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
