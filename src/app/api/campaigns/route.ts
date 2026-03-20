import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError, UnauthorizedError } from '@/lib/errors';
import * as campaignRepo from '@/repositories/campaign.repository';

// GET /api/campaigns - Listar campanhas (com status de adesao para colaboradoras)
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    
    // Se for colaboradora, queremos ver o status de 'joined'
    if (auth.role === 'colaboradora') {
      const data = campaignRepo.getUserCampaigns(auth.userId, auth.companyId);
      return NextResponse.json(data);
    }
    
    // Se for RH/Lideranca, listagem geral da empresa
    const data = campaignRepo.getCampaignsByCompany(auth.companyId);
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
});

// POST /api/campaigns - Criar nova campanha (Apenas RH)
export const POST = withAuth(async (req, { auth }) => {
  try {
    if (auth.role !== 'rh') {
      throw new UnauthorizedError('Apenas RH pode criar campanhas');
    }

    await initDb();
    const body = await req.json();
    const { name, month, color, status, statusLabel } = body;

    if (!name || !month || !color) {
      return NextResponse.json({ error: 'Campos obrigatórios: name, month, color' }, { status: 400 });
    }

    const campaign = await campaignRepo.createCampaign({
      name,
      month,
      color,
      status: status || 'next',
      statusLabel: statusLabel || 'Próxima',
      companyId: auth.companyId
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
