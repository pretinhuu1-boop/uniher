import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getWriteQueue } from '@/lib/db';
import {
  runAsActiveCompanyActor,
  runAsActiveRhActor,
} from '@/lib/security/active-rh-actor';
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
    const companyId = auth.companyId;
    if (!['admin', 'rh'].includes(auth.role) || !companyId) {
      return NextResponse.json({ error: 'Gestor não vinculado à empresa' }, { status: 403 });
    }

    await initDb();
    const body = await req.json();
    const parsed = createCampaignSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, month, color, status, statusLabel, start_date, end_date, theme, theme_color } = parsed.data;

    const id = `camp_${Math.random().toString(36).slice(2, 9)}`;
    const writeQueue = getWriteQueue();
    const outcome = await writeQueue.enqueue((db) => {
      const operation = () => {
        db.prepare(`
          INSERT INTO campaigns (
            id, name, month, color, status, status_label, company_id,
            start_date, end_date, theme, theme_color
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          name,
          month || '',
          color,
          status,
          statusLabel || 'Próxima',
          companyId,
          start_date || null,
          end_date || null,
          theme || null,
          theme_color || null,
        );

        return db.prepare(`
          SELECT *
          FROM campaigns
          WHERE id = ? AND company_id = ?
        `).get(id, companyId);
      };

      return auth.role === 'rh'
        ? runAsActiveRhActor(db, auth.userId, companyId, operation)
        : runAsActiveCompanyActor(db, auth.userId, companyId, 'admin', operation);
    }, 'create managed campaign', { retryOnFailure: false });

    if (!outcome.authorized) {
      return NextResponse.json({ error: 'Autorização de gestão expirou' }, { status: 409 });
    }

    return NextResponse.json(outcome.value, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
