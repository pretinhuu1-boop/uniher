/**
 * GET /api/rh/agenda — lista eventos de todas as colaboradoras da empresa
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';

export const GET = withRole('rh', 'lideranca', 'admin')(async (req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const companyId = context.auth.companyId;

  if (!companyId) {
    return NextResponse.json({ error: 'Sem empresa vinculada' }, { status: 403 });
  }

  const url = new URL(req.url);
  const month = url.searchParams.get('month');
  const type = url.searchParams.get('type');

  let query = `
    SELECT he.id, he.title, he.type, he.date, he.time, he.status, he.notes,
           u.name as user_name, u.email as user_email, u.id as user_id
    FROM health_events he
    JOIN users u ON u.id = he.user_id
    WHERE he.company_id = ? AND he.deleted_at IS NULL
  `;
  const params: any[] = [companyId];

  if (month) {
    query += ` AND he.date LIKE ?`;
    params.push(month + '%');
  }

  if (type && type !== 'all') {
    query += ` AND he.type = ?`;
    params.push(type);
  }

  query += ` ORDER BY he.date ASC, he.time ASC`;

  const events = db.prepare(query).all(...params);

  // Stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed,
      COUNT(CASE WHEN type = 'exame' THEN 1 END) as exames,
      COUNT(CASE WHEN type = 'consulta' THEN 1 END) as consultas
    FROM health_events
    WHERE company_id = ? AND deleted_at IS NULL
  `).get(companyId);

  return NextResponse.json({ events, stats });
});
