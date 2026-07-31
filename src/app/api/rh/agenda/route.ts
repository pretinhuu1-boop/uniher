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

  const where = ['he.company_id = ?', 'he.deleted_at IS NULL'];
  const params: any[] = [companyId];

  if (context.auth.role === 'lideranca') {
    const leader = db.prepare(`
      SELECT department_id
      FROM users
      WHERE id = ? AND company_id = ? AND role = 'lideranca' AND deleted_at IS NULL
    `).get(context.auth.userId, companyId) as { department_id: string | null } | undefined;
    if (!leader?.department_id) {
      return NextResponse.json({
        events: [],
        stats: { total: 0, pending: 0, completed: 0, missed: 0, exames: 0, consultas: 0 },
      });
    }
    where.push('u.department_id = ?');
    params.push(leader.department_id);
  }

  if (month) {
    where.push('he.date LIKE ?');
    params.push(month + '%');
  }

  if (type && type !== 'all') {
    where.push('he.type = ?');
    params.push(type);
  }

  const events = db.prepare(`
    SELECT he.date, he.type, he.status, COUNT(*) as count
    FROM health_events he
    JOIN users u ON u.id = he.user_id
    WHERE ${where.join(' AND ')}
    GROUP BY he.date, he.type, he.status
    ORDER BY he.date ASC, he.type ASC, he.status ASC
  `).all(...params);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed,
      COUNT(CASE WHEN type = 'exame' THEN 1 END) as exames,
      COUNT(CASE WHEN type = 'consulta' THEN 1 END) as consultas
    FROM health_events he
    JOIN users u ON u.id = he.user_id
    WHERE ${where.join(' AND ')}
  `).get(...params);

  return NextResponse.json({ events, stats });
});
