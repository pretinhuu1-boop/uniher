import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { logAudit } from '@/lib/audit';
import { checkAdminRateLimit } from '@/lib/security/rate-limit';
import { getEmployeeImportActor } from '@/lib/employee-import/access';
import { getRequestIp, readEmployeeImportCsvBody } from '@/lib/employee-import/http';
import { parseEmployeeImportCsv } from '@/lib/employee-import/parser';
import { commitEmployeeImport } from '@/lib/employee-import/repository';

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

  const parsed = parseEmployeeImportCsv(csvBody.body.csv, {
    companyId: actor.companyId,
    expectedCompanyName: actor.companyName,
  });
  const requestIp = getRequestIp(req);
  const parseSummary = {
    totalRows: parsed.totalRows,
    validRows: parsed.validRows.length,
    errorRows: parsed.errorRows.length,
  };

  if (parsed.errorRows.length > 0 || parsed.validRows.length === 0) {
    await logAudit({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'employee_import_commit',
      entityType: 'company',
      entityId: actor.companyId,
      entityLabel: actor.companyName,
      details: { status: 'rejected', ...parseSummary },
      ip: requestIp,
    });
    return NextResponse.json({
      error: 'Planilha possui erros de validacao',
      summary: parseSummary,
      errorRows: parsed.errorRows,
    }, {
      status: 422,
      headers: {
        'Cache-Control': 'private, no-store',
        Vary: 'Cookie',
      },
    });
  }

  const result = await getWriteQueue().enqueue((db) => commitEmployeeImport(db, {
    companyId: actor.companyId,
    actorId: actor.id,
    filename: csvBody.body.filename,
    csv: csvBody.body.csv,
    rows: parsed.validRows,
  }), 'employee-import-commit');
  const summary = {
    totalRows: result.totalRows,
    validRows: result.validRows,
    errorRows: result.errorRows,
    insertedRows: result.insertedRows,
    updatedRows: result.updatedRows,
  };

  await logAudit({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'employee_import_commit',
    entityType: 'employee_import_batch',
    entityId: result.batchId,
    entityLabel: csvBody.body.filename ?? 'planilha de colaboradoras',
    details: { status: result.duplicate ? 'duplicate' : 'committed', ...summary },
    ip: requestIp,
  });

  return NextResponse.json({
    batchId: result.batchId,
    fileSha256: result.fileSha256,
    duplicate: result.duplicate === true ? true : undefined,
    summary,
  }, {
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
});
