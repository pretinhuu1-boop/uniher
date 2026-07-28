import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { logAudit } from '@/lib/audit';
import { checkAdminRateLimit } from '@/lib/security/rate-limit';
import { getEmployeeImportActor } from '@/lib/employee-import/access';
import { parseEmployeeImportCsv, toEmployeeImportPreviewRow } from '@/lib/employee-import/parser';

const MAX_CSV_BYTES = 2_000_000;

async function readCsvBody(req: Request): Promise<{ ok: true; csv: string } | { ok: false; status: number; error: string }> {
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_CSV_BYTES) {
    return { ok: false, status: 413, error: 'Arquivo muito grande. Limite: 2MB.' };
  }

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { ok: false, status: 422, error: 'Arquivo CSV nao encontrado.' };
    }
    if (file.size > MAX_CSV_BYTES) {
      return { ok: false, status: 413, error: 'Arquivo muito grande. Limite: 2MB.' };
    }
    return { ok: true, csv: await file.text() };
  }

  const csv = await req.text();
  if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES) {
    return { ok: false, status: 413, error: 'Arquivo muito grande. Limite: 2MB.' };
  }
  if (!csv.trim()) {
    return { ok: false, status: 422, error: 'Arquivo CSV vazio.' };
  }
  return { ok: true, csv };
}

export const POST = withRole('rh', 'admin')(async (req, context) => {
  await checkAdminRateLimit(req);
  await initDb();

  const actor = getEmployeeImportActor(getReadDb(), context.auth);
  if (!actor) {
    return NextResponse.json({ error: 'Sem permissao para importar colaboradoras' }, { status: 403 });
  }

  const body = await readCsvBody(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const result = parseEmployeeImportCsv(body.csv, {
    companyId: actor.companyId,
    expectedCompanyName: actor.companyName,
  });
  const requestIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || undefined;
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
