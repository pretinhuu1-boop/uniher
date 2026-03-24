import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { initDb } from '@/lib/db/init';
import { getReadDb } from '@/lib/db';

export const GET = withRole('rh', 'admin')(async (req: NextRequest, context) => {
  try {
    await initDb();
    const db = getReadDb();

    const { searchParams } = new URL(req.url);
    const period = parseInt(searchParams.get('period') || '30', 10);
    const validPeriods = [7, 30, 90];
    const days = validPeriods.includes(period) ? period : 30;

    const since = `datetime('now', '-${days} days')`;
    const companyId = context.auth.companyId;
    const isAdmin = context.auth.role === 'admin' && !companyId;

    // Invites by status in period (filtered by company for RH)
    const invitesByStatus = db.prepare(`
      SELECT i.status, COUNT(*) as count
      FROM invites i
      WHERE i.created_at >= ${since}
      ${isAdmin ? '' : 'AND i.company_id = ?'}
      GROUP BY i.status
    `).all(...(isAdmin ? [] : [companyId])) as { status: string; count: number }[];

    const inviteCounts: Record<string, number> = { pending: 0, accepted: 0, expired: 0 };
    invitesByStatus.forEach(r => { inviteCounts[r.status] = r.count; });
    const totalInvites = Object.values(inviteCounts).reduce((a, b) => a + b, 0);
    const acceptRate = totalInvites > 0 ? Math.round((inviteCounts.accepted / totalInvites) * 100) : 0;

    // Notifications by type in period (filtered by company for RH)
    const notifByType = db.prepare(`
      SELECT n.type, COUNT(*) as count
      FROM notifications n
      ${isAdmin ? '' : 'JOIN users u ON u.id = n.user_id'}
      WHERE n.created_at >= ${since}
      ${isAdmin ? '' : 'AND u.company_id = ?'}
      GROUP BY n.type
    `).all(...(isAdmin ? [] : [companyId])) as { type: string; count: number }[];

    const totalNotifications = notifByType.reduce((a, b) => a + b.count, 0);

    // Activity log by action in period (filtered by company for RH)
    const activityByAction = db.prepare(`
      SELECT al.action, COUNT(*) as count
      FROM activity_log al
      ${isAdmin ? '' : 'JOIN users u ON u.id = al.user_id'}
      WHERE al.created_at >= ${since}
      ${isAdmin ? '' : 'AND u.company_id = ?'}
      GROUP BY al.action
    `).all(...(isAdmin ? [] : [companyId])) as { action: string; count: number }[];

    const alertCount = notifByType.find(n => n.type === 'alert')?.count ?? 0;

    // Timeline: notifications per day (for chart) (filtered by company for RH)
    const timelineQuery = days <= 30
      ? `SELECT date(n.created_at) as day, COUNT(*) as count
         FROM notifications n
         ${isAdmin ? '' : 'JOIN users u ON u.id = n.user_id'}
         WHERE n.created_at >= ${since}
         ${isAdmin ? '' : 'AND u.company_id = ?'}
         GROUP BY date(n.created_at)
         ORDER BY day ASC`
      : `SELECT strftime('%Y-W%W', n.created_at) as day, COUNT(*) as count
         FROM notifications n
         ${isAdmin ? '' : 'JOIN users u ON u.id = n.user_id'}
         WHERE n.created_at >= ${since}
         ${isAdmin ? '' : 'AND u.company_id = ?'}
         GROUP BY strftime('%Y-W%W', n.created_at)
         ORDER BY day ASC`;

    const timeline = db.prepare(timelineQuery).all(...(isAdmin ? [] : [companyId])) as { day: string; count: number }[];

    return NextResponse.json({
      period: days,
      kpis: {
        invitesSent: totalInvites,
        notificationsCreated: totalNotifications,
        alertsSent: alertCount,
        acceptRate,
      },
      invitesByStatus: inviteCounts,
      notificationsByType: notifByType,
      activityByAction: activityByAction,
      timeline,
    });
  } catch (error) {
    console.error('[analytics/communications] Error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
});
