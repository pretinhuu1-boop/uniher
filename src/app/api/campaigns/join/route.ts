import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as campaignRepo from '@/repositories/campaign.repository';
import * as activityService from '@/services/activity.service';

// POST /api/campaigns/join - Aderir a uma campanha ativa
export const POST = withAuth(async (req, { auth }) => {
  try {
    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId é obrigatório' }, { status: 400 });
    }

    await initDb();
    
    // 1. Persistir adesao
    await campaignRepo.joinCampaign(auth.userId, campaignId);
    
    // 2. Registrar atividade e dar pontos (100 pts por aderir)
    const result = await activityService.recordActivity(auth.userId, {
      action: 'join_campaign',
      targetType: 'campaign',
      targetId: campaignId,
      points: 100
    });

    return NextResponse.json({
      success: true,
      pointsEarned: result.pointsEarned,
      newStreak: result.newStreak,
      badgeUnlocked: result.badgeUnlocked
    });
  } catch (error) {
    return handleApiError(error);
  }
});
