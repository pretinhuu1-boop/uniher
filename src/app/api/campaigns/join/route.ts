import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import * as campaignRepo from '@/repositories/campaign.repository';

const joinCampaignSchema = z.object({
  campaignId: z.string().trim().min(1).max(100),
});

// POST /api/campaigns/join - Join an active campaign.
export const POST = withAuth(async (req, { auth }) => {
  try {
    const parsed = joinCampaignSchema.safeParse(await req.json());

    if (!parsed.success) {
      return NextResponse.json({ error: 'campaignId e obrigatorio' }, { status: 400 });
    }
    if (!auth.companyId) {
      return NextResponse.json({ error: 'Usuario sem empresa ativa' }, { status: 403 });
    }

    await initDb();
    const result = await campaignRepo.joinCampaign(
      auth.userId,
      auth.companyId,
      parsed.data.campaignId,
    );

    if (result.status === 'actor_inactive') {
      return NextResponse.json(
        { error: 'Autorizacao da conta expirou' },
        { status: 409 },
      );
    }
    if (result.status === 'campaign_unavailable') {
      return NextResponse.json(
        { error: 'Campanha ativa nao encontrada' },
        { status: 404 },
      );
    }
    if (result.status === 'already_joined') {
      return NextResponse.json({
        success: true,
        alreadyJoined: true,
        pointsEarned: 0,
      });
    }

    return NextResponse.json({
      success: true,
      pointsEarned: result.pointsEarned,
      newStreak: result.newStreak,
      badgeUnlocked: result.badgeUnlocked,
      levelUp: result.levelUp,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
