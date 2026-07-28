import { NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkReadRateLimit } from '@/lib/security/rate-limit';
import { getEmployeeImportActor } from '@/lib/employee-import/access';
import { makeEmployeeImportTemplateCsv } from '@/lib/employee-import/contract';

export const GET = withRole('rh', 'admin')(async (req, context) => {
  await checkReadRateLimit(req);
  await initDb();

  const actor = getEmployeeImportActor(getReadDb(), context.auth);
  if (!actor) {
    return NextResponse.json({ error: 'Sem permissao para importar colaboradoras' }, { status: 403 });
  }

  return new NextResponse(makeEmployeeImportTemplateCsv(), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="uniher-colaboradoras-template.csv"',
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
});
