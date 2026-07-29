import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { logAudit } from '@/lib/audit';
import { checkAdminRateLimit } from '@/lib/security/rate-limit';
import { getEmployeeImportActor } from '@/lib/employee-import/access';
import { getRequestIp, readEmployeeImportCsvBody } from '@/lib/employee-import/http';
import { parseEmployeeImportCsv, toEmployeeImportPreviewRow } from '@/lib/employee-import/parser';

export const POST = withRole('rh', 'admin')(async (req, context) => {
  await checkAdminRateLimit(req);
  await initDb();

  const actor = getEmployeeImportActor(getReadDb(), context.auth);
  if (!actor) {
    return NextResponse.json({ error: 'Sem permissao para importar colaboradoras' }, { status: 403 });
  }

  const csvBody = await readEmployeeImportCsvBody(req);
  if (!csvBody.ok) {
    return NextResponse.json({ error: csvBody.error }, { status: csvBody.status });
  }

  const result = parseEmployeeImportCsv(csvBody.body.csv, {
    companyId: actor.companyId,
    expectedCompanyName: actor.companyName,
  });
  const requestIp = getRequestIp(req);
  const summary = {
    totalRows: result.totalRows,
    validRows: result.validRows.length,
    errorRows: result.errorRows.length,
  };

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'employee_import_preview',
    entityType: 'company',
    entityId: actor.companyId,
    entityLabel: actor.companyName,
    details: summary,
    ip: requestIp,
  });

  return NextResponse.json({
    companyId: actor.companyId,
    companyName: actor.companyName,
    summary,
    validRows: result.validRows.map(toEmployeeImportPreviewRow),
    errorRows: result.errorRows,
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
});
