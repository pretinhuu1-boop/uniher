import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as campaignRepo from '@/repositories/campaign.repository';
import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';

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
    
    return NextResponse.json({
      success: true,
      progressRecorded: true,
      gamification: LEGACY_GAMIFICATION_STATE,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
