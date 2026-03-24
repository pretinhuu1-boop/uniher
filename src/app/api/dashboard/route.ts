import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as dashService from '@/services/dashboard.service';

export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();

    const companyId = auth.companyId;

    const [kpis, departments, engagement, ageDistribution, healthRisk, roi, invites, campaigns, reports] = await Promise.all([
      Promise.resolve(dashService.getDashboardKPIs(companyId)),
      Promise.resolve(dashService.getDepartmentRanking(companyId)),
      Promise.resolve(dashService.getEngagementOverTime(companyId)),
      Promise.resolve(dashService.getAgeDistribution(companyId)),
      Promise.resolve(dashService.getHealthRiskEvolution(companyId)),
      Promise.resolve(dashService.getROIData(companyId)),
      Promise.resolve(dashService.getInviteStatus(companyId)),
      Promise.resolve(dashService.getCampaignsDashboard(companyId)),
      Promise.resolve(dashService.getReportConfigs(companyId)),
    ]);

    return NextResponse.json({
      kpis,
      departments,
      engagement,
      ageDistribution,
      healthRisk,
      roi,
      invites,
      campaigns,
      reports,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
