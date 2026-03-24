import * as userRepo from '@/repositories/user.repository';
import * as deptRepo from '@/repositories/department.repository';
import * as campaignRepo from '@/repositories/campaign.repository';
import { getReadDb } from '@/lib/db';

export interface DashboardKPI {
  label: string;
  value: string | number;
  subtitle: string;
  icon: string;
  trend: string;
  trendDirection: 'up' | 'down' | 'stable';
  color: string;
}

export interface ROIData {
  roiMultiplier: number;
  savings: string;
  absenteeismReduction: string;
}

export interface EngagementPoint {
  month: string;
  engagement: number;
  retention: number;
}

export interface InviteStatus {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
}

/* ── helpers ── */

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function computeTrend(current: number, previous: number): { trend: string; trendDirection: 'up' | 'down' | 'stable' } {
  if (previous === 0) return { trend: 'sem dados anteriores', trendDirection: 'stable' };
  const diff = Math.round(((current - previous) / previous) * 100);
  if (diff > 0) return { trend: `+${diff}% vs mês anterior`, trendDirection: 'up' };
  if (diff < 0) return { trend: `${diff}% vs mês anterior`, trendDirection: 'down' };
  return { trend: 'estável vs mês anterior', trendDirection: 'stable' };
}

/* ── KPIs ── */

export function getDashboardKPIs(companyId: string): DashboardKPI[] {
  try {
    const db = getReadDb();

    const totalUsers = userRepo.countUsersByCompany(companyId);
    const activeCampaigns = campaignRepo.countActiveCampaigns(companyId);

    // Active users (last_active in last 7 days)
    const activeUsersRow = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE company_id = ? AND last_active >= datetime('now', '-7 days')
    `).get(companyId) as { count: number };
    const activeUsers = activeUsersRow.count;

    // Active users previous month (8-14 days ago window)
    const prevActiveRow = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE company_id = ? AND last_active >= datetime('now', '-14 days') AND last_active < datetime('now', '-7 days')
    `).get(companyId) as { count: number };
    const activeUsersTrend = computeTrend(activeUsers, prevActiveRow.count);

    // Engagement (% of users with streak > 0)
    const engagedRow = db.prepare(`
      SELECT COUNT(*) as count FROM users WHERE company_id = ? AND streak > 0
    `).get(companyId) as { count: number };
    const engagementRate = totalUsers > 0 ? Math.round((engagedRow.count / totalUsers) * 100) : 0;

    // Previous month engagement
    const prevEngagedRow = db.prepare(`
      SELECT COUNT(*) as count FROM activity_log al
      JOIN users u ON u.id = al.user_id
      WHERE u.company_id = ? AND al.created_at >= datetime('now', '-60 days') AND al.created_at < datetime('now', '-30 days')
    `).get(companyId) as { count: number };
    const prevTotalForEngagement = totalUsers; // approximation
    const prevEngRate = prevTotalForEngagement > 0 ? Math.round((prevEngagedRow.count / prevTotalForEngagement) * 100) : 0;
    const engTrend = computeTrend(engagementRate, prevEngRate);

    // Exams up-to-date
    const totalExamsRow = db.prepare(`
      SELECT COUNT(*) as count FROM user_exams ue
      JOIN users u ON u.id = ue.user_id
      WHERE u.company_id = ?
    `).get(companyId) as { count: number };
    const completedExamsRow = db.prepare(`
      SELECT COUNT(*) as count FROM user_exams ue
      JOIN users u ON u.id = ue.user_id
      WHERE u.company_id = ? AND ue.status = 'completed'
    `).get(companyId) as { count: number };
    const examsPercent = totalExamsRow.count > 0
      ? Math.round((completedExamsRow.count / totalExamsRow.count) * 100)
      : 0;
    const examsDisplay = totalExamsRow.count > 0 ? `${examsPercent}%` : '\u2014';

    // Completed activities
    const activitiesRow = db.prepare(`
      SELECT COUNT(*) as count FROM user_challenges uc
      JOIN users u ON u.id = uc.user_id
      WHERE u.company_id = ? AND uc.status = 'completed'
    `).get(companyId) as { count: number };

    // Previous month activities
    const prevActivitiesRow = db.prepare(`
      SELECT COUNT(*) as count FROM user_challenges uc
      JOIN users u ON u.id = uc.user_id
      WHERE u.company_id = ? AND uc.status = 'completed'
        AND uc.completed_at >= datetime('now', '-60 days') AND uc.completed_at < datetime('now', '-30 days')
    `).get(companyId) as { count: number };
    const currentActivitiesRow = db.prepare(`
      SELECT COUNT(*) as count FROM user_challenges uc
      JOIN users u ON u.id = uc.user_id
      WHERE u.company_id = ? AND uc.status = 'completed'
        AND uc.completed_at >= datetime('now', '-30 days')
    `).get(companyId) as { count: number };
    const actTrend = computeTrend(currentActivitiesRow.count, prevActivitiesRow.count);

    return [
      {
        label: 'Colaboradoras Ativas',
        value: activeUsers,
        subtitle: `de ${totalUsers} cadastradas`,
        icon: 'users',
        trend: activeUsersTrend.trend,
        trendDirection: activeUsersTrend.trendDirection,
        color: '#C9A264',
      },
      {
        label: 'Engajamento',
        value: `${engagementRate}%`,
        subtitle: 'últimos 30 dias',
        icon: 'trending-up',
        trend: engTrend.trend,
        trendDirection: engTrend.trendDirection,
        color: '#3E7D5A',
      },
      {
        label: 'Exames em Dia',
        value: examsDisplay,
        subtitle: 'meta: 85%',
        icon: 'check-circle',
        trend: totalExamsRow.count > 0 ? `${completedExamsRow.count} de ${totalExamsRow.count}` : 'sem dados',
        trendDirection: examsPercent >= 85 ? 'up' : examsPercent >= 60 ? 'stable' : 'down',
        color: '#378ADD',
      },
      {
        label: 'Atividades Concluídas',
        value: activitiesRow.count,
        subtitle: `${activeCampaigns} campanhas ativas`,
        icon: 'activity',
        trend: actTrend.trend,
        trendDirection: actTrend.trendDirection,
        color: '#EF9F27',
      },
    ];
  } catch (err) {
    console.error('[Dashboard] getDashboardKPIs error:', err);
    return [];
  }
}

/* ── ROI ── */

export function getROIData(companyId: string): ROIData {
  try {
    const totalUsers = userRepo.countUsersByCompany(companyId);
    const savings = Math.round(totalUsers * 353);
    const savingsFormatted = savings >= 1000
      ? `R$ ${Math.round(savings / 1000)}k`
      : `R$ ${savings}`;

    return {
      roiMultiplier: totalUsers > 0 ? 4.8 : 0,
      savings: savingsFormatted,
      absenteeismReduction: totalUsers > 0 ? '-23%' : '—',
    };
  } catch (err) {
    console.error('[Dashboard] getROIData error:', err);
    return { roiMultiplier: 0, savings: 'R$ 0', absenteeismReduction: '—' };
  }
}

/* ── Department ranking ── */

export function getDepartmentRanking(companyId: string) {
  try {
    const stats = deptRepo.getDepartmentStats(companyId);

    return stats.map((d, index) => ({
      id: d.id,
      name: d.name,
      collaborators: d.collaborators,
      points: d.points,
      level: Math.ceil(d.points / 1000) || 1,
      badges: d.badges,
      engagementPercent: d.engagement_percent,
      examsPercent: d.exams_percent,
      trend: index < 2 ? ('up' as const) : index > 3 ? ('down' as const) : ('stable' as const),
      color: d.color,
    }));
  } catch (err) {
    console.error('[Dashboard] getDepartmentRanking error:', err);
    return [];
  }
}

/* ── Engagement over time ── */

export function getEngagementOverTime(companyId: string): EngagementPoint[] {
  try {
    const db = getReadDb();

    // Active users per month (last 6 months) from activity_log
    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', al.created_at) as ym,
        COUNT(DISTINCT al.user_id) as active_users
      FROM activity_log al
      JOIN users u ON u.id = al.user_id
      WHERE u.company_id = ? AND al.created_at >= datetime('now', '-6 months')
      GROUP BY ym
      ORDER BY ym ASC
    `).all(companyId) as { ym: string; active_users: number }[];

    if (rows.length === 0) return [];

    const totalUsers = userRepo.countUsersByCompany(companyId);
    if (totalUsers === 0) return [];

    // Retained users: those active in consecutive months
    const retainedRows = db.prepare(`
      SELECT
        curr.ym as ym,
        COUNT(DISTINCT curr.user_id) as retained
      FROM (
        SELECT DISTINCT strftime('%Y-%m', created_at) as ym, user_id
        FROM activity_log al
        JOIN users u ON u.id = al.user_id
        WHERE u.company_id = ? AND al.created_at >= datetime('now', '-7 months')
      ) curr
      INNER JOIN (
        SELECT DISTINCT strftime('%Y-%m', created_at) as ym, user_id
        FROM activity_log al
        JOIN users u ON u.id = al.user_id
        WHERE u.company_id = ? AND al.created_at >= datetime('now', '-7 months')
      ) prev ON curr.user_id = prev.user_id
        AND prev.ym = strftime('%Y-%m', date(curr.ym || '-01', '-1 month'))
      WHERE curr.ym >= strftime('%Y-%m', datetime('now', '-6 months'))
      GROUP BY curr.ym
      ORDER BY curr.ym ASC
    `).all(companyId, companyId) as { ym: string; retained: number }[];

    const retainedMap = new Map(retainedRows.map(r => [r.ym, r.retained]));

    return rows.map(r => {
      const mm = r.ym.split('-')[1];
      const engagement = Math.round((r.active_users / totalUsers) * 100);
      const retained = retainedMap.get(r.ym) ?? 0;
      const retention = r.active_users > 0 ? Math.round((retained / r.active_users) * 100) : 0;
      return {
        month: MONTH_LABELS[mm] ?? mm,
        engagement: Math.min(engagement, 100),
        retention: Math.min(retention, 100),
      };
    });
  } catch (err) {
    console.error('[Dashboard] getEngagementOverTime error:', err);
    return [];
  }
}

/* ── Age distribution ── */

export function getAgeDistribution(companyId: string) {
  try {
    const db = getReadDb();

    const rows = db.prepare(`
      SELECT
        CASE
          WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) BETWEEN 18 AND 25 THEN '18-25'
          WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) BETWEEN 26 AND 35 THEN '26-35'
          WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) BETWEEN 36 AND 45 THEN '36-45'
          WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) BETWEEN 46 AND 55 THEN '46-55'
          WHEN CAST((julianday('now') - julianday(birth_date)) / 365.25 AS INTEGER) > 55 THEN '56+'
          ELSE NULL
        END as age_bucket,
        COUNT(*) as cnt
      FROM users
      WHERE company_id = ? AND birth_date IS NOT NULL AND birth_date != ''
      GROUP BY age_bucket
      HAVING age_bucket IS NOT NULL
      ORDER BY age_bucket ASC
    `).all(companyId) as { age_bucket: string; cnt: number }[];

    if (rows.length === 0) return [];

    const total = rows.reduce((sum, r) => sum + r.cnt, 0);
    if (total === 0) return [];

    const colorMap: Record<string, string> = {
      '18-25': '#C9A264',
      '26-35': '#E8849E',
      '36-45': '#3E7D5A',
      '46-55': '#378ADD',
      '56+': '#EF9F27',
    };

    return rows.map(r => ({
      label: r.age_bucket,
      percent: Math.round((r.cnt / total) * 100),
      color: colorMap[r.age_bucket] ?? '#999',
    }));
  } catch (err) {
    console.error('[Dashboard] getAgeDistribution error:', err);
    return [];
  }
}

/* ── Health risk evolution ── */

export function getHealthRiskEvolution(companyId: string) {
  try {
    const db = getReadDb();

    const rows = db.prepare(`
      SELECT
        strftime('%Y-%m', hs.recorded_at) as ym,
        SUM(CASE WHEN hs.score >= 7 THEN 1 ELSE 0 END) as low_count,
        SUM(CASE WHEN hs.score >= 4 AND hs.score < 7 THEN 1 ELSE 0 END) as medium_count,
        SUM(CASE WHEN hs.score < 4 THEN 1 ELSE 0 END) as high_count,
        COUNT(*) as total
      FROM health_scores hs
      JOIN users u ON u.id = hs.user_id
      WHERE u.company_id = ? AND hs.recorded_at >= datetime('now', '-6 months')
      GROUP BY ym
      ORDER BY ym ASC
    `).all(companyId) as { ym: string; low_count: number; medium_count: number; high_count: number; total: number }[];

    if (rows.length === 0) return [];

    return rows.map(r => {
      const mm = r.ym.split('-')[1];
      return {
        month: MONTH_LABELS[mm] ?? mm,
        low: r.total > 0 ? Math.round((r.low_count / r.total) * 100) : 0,
        medium: r.total > 0 ? Math.round((r.medium_count / r.total) * 100) : 0,
        high: r.total > 0 ? Math.round((r.high_count / r.total) * 100) : 0,
      };
    });
  } catch (err) {
    console.error('[Dashboard] getHealthRiskEvolution error:', err);
    return [];
  }
}

/* ── Invites ── */

export function getInviteStatus(companyId: string): InviteStatus {
  try {
    const db = getReadDb();
    const total = (db.prepare('SELECT COUNT(*) as count FROM invites WHERE company_id = ?').get(companyId) as { count: number }).count;
    const pending = (db.prepare("SELECT COUNT(*) as count FROM invites WHERE company_id = ? AND status = 'pending'").get(companyId) as { count: number }).count;
    const accepted = (db.prepare("SELECT COUNT(*) as count FROM invites WHERE company_id = ? AND status = 'accepted'").get(companyId) as { count: number }).count;
    const expired = (db.prepare("SELECT COUNT(*) as count FROM invites WHERE company_id = ? AND status = 'expired'").get(companyId) as { count: number }).count;

    return { total, pending, accepted, expired };
  } catch (err) {
    console.error('[Dashboard] getInviteStatus error:', err);
    return { total: 0, pending: 0, accepted: 0, expired: 0 };
  }
}

/* ── Campaigns ── */

export function getCampaignsDashboard(companyId: string) {
  try {
    const campaigns = campaignRepo.getCampaignsByCompany(companyId);
    return campaigns.map(c => ({
      id: c.id,
      name: c.name,
      month: c.month,
      color: c.color,
      status: c.status,
      statusLabel: c.status_label,
      progress: c.status === 'done' ? 100 : c.status === 'active' ? 65 : 0,
    }));
  } catch (err) {
    console.error('[Dashboard] getCampaignsDashboard error:', err);
    return [];
  }
}

/* ── Report configs ── */

export function getReportConfigs(companyId: string) {
  try {
    const db = getReadDb();
    return db.prepare('SELECT * FROM report_configs WHERE company_id = ?').all(companyId);
  } catch (err) {
    console.error('[Dashboard] getReportConfigs error:', err);
    return [];
  }
}
