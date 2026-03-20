import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { queryAuditLogs, countAuditLogs } from '@/lib/audit';

export const GET = withRole('admin')(async (req: NextRequest) => {
  await initDb();
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') as 'day' | 'week' | 'month' | 'custom' | null;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const action = searchParams.get('action') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const download = searchParams.get('download') === '1';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = download ? 10000 : 50;
  const offset = (page - 1) * limit;

  const filters = { period: period ?? undefined, from, to, action, search, limit, offset };
  const logs = queryAuditLogs(filters);
  const total = countAuditLogs({ period: period ?? undefined, from, to, action, search });

  if (download) {
    const header = 'Data/Hora,Ator,Papel,Ação,Entidade,Detalhe,IP\n';
    const rows = logs.map(l => {
      const date = l.created_at.replace('T', ' ');
      const details = l.details ? JSON.parse(l.details) : {};
      const detailStr = Object.entries(details).map(([k, v]) => `${k}:${v}`).join('; ');
      return [
        date,
        l.actor_email,
        l.actor_role,
        l.action,
        `${l.entity_type ?? ''} ${l.entity_label ?? ''}`.trim(),
        detailStr,
        l.ip ?? '',
      ].map(v => `"${v}"`).join(',');
    }).join('\n');
    const csv = header + rows;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) });
});
