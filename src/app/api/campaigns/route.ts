import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError, UnauthorizedError } from '@/lib/errors';
import * as campaignRepo from '@/repositories/campaign.repository';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  month: z.string().optional().default(''),
  color: z.string().min(1, 'Cor é obrigatória'),
  status: z.enum(['next', 'active', 'done']).optional().default('next'),
  statusLabel: z.string().optional(),
  start_date: z.string().regex(dateRegex, 'Formato YYYY-MM-DD').optional(),
  end_date: z.string().regex(dateRegex, 'Formato YYYY-MM-DD').optional(),
  theme: z.string().optional(),
  theme_color: z.string().optional(),
});

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
    if (auth.role !== 'rh' && auth.role !== 'admin') {
      throw new UnauthorizedError('Apenas Admin Empresa ou Admin Master podem criar campanhas');
    }

    await initDb();
    const body = await req.json();
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, month, color, status, statusLabel, start_date, end_date, theme, theme_color } = parsed.data;

    const campaign = await campaignRepo.createCampaign({
      name,
      month: month || '',
      color,
      status,
      statusLabel: statusLabel || 'Próxima',
      companyId: auth.companyId,
      start_date,
      end_date,
      theme,
      theme_color,
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
