import { hasCollaboratorSelfCapability } from '@/lib/auth/collaborator-self';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { AppError } from '@/lib/errors';

export interface CampaignRow {
  id: string;
  name: string;
  month: string;
  color: string;
  status: string;
  status_label: string | null;
  company_id: string | null;
  start_date: string | null;
  end_date: string | null;
  theme: string | null;
  theme_color: string | null;
  created_at: string;
}

export interface UserCampaignRow extends CampaignRow {
  progress: number;
  joined: boolean;
}

type CampaignJoinRow = Pick<CampaignRow, 'id' | 'status' | 'start_date' | 'end_date'>;

function currentDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getCampaignsByCompany(companyId: string): CampaignRow[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT * FROM campaigns
    WHERE company_id = ? OR company_id IS NULL
    ORDER BY created_at ASC
  `).all(companyId) as CampaignRow[];
}

export function getUserCampaigns(userId: string, companyId: string): UserCampaignRow[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT
      c.*,
      COALESCE(uc.progress, 0) as progress,
      CASE WHEN uc.user_id IS NOT NULL THEN 1 ELSE 0 END as joined
    FROM campaigns c
    LEFT JOIN user_campaigns uc ON uc.campaign_id = c.id AND uc.user_id = ?
    WHERE c.company_id = ? OR c.company_id IS NULL
    ORDER BY c.created_at ASC
  `).all(userId, companyId) as UserCampaignRow[];
}

export function countActiveCampaigns(companyId: string): number {
  const db = getReadDb();
  const today = currentDateKey();
  const row = db.prepare(
    `SELECT COUNT(*) as count
     FROM campaigns
     WHERE (company_id = ? OR company_id IS NULL)
       AND status = 'active'
       AND (start_date IS NULL OR substr(start_date, 1, 10) <= ?)
       AND (end_date IS NULL OR substr(end_date, 1, 10) >= ?)`
  ).get(companyId, today, today) as { count: number };
  return row.count;
}

export async function joinCampaign(input: {
  userId: string;
  companyId: string;
  campaignId: string;
}): Promise<void> {
  const writeQueue = getWriteQueue();
  await writeQueue.enqueue((db) => {
    const guardedJoin = db.transaction(() => {
      if (!hasCollaboratorSelfCapability(input.userId, db)) {
        throw new AppError('Permissao insuficiente', 403, 'COLLABORATOR_CAPABILITY_REQUIRED');
      }

      const campaign = db.prepare(`
        SELECT id, status, start_date, end_date
        FROM campaigns
        WHERE id = ?
          AND (company_id = ? OR company_id IS NULL)
      `).get(input.campaignId, input.companyId) as CampaignJoinRow | undefined;

      if (!campaign) {
        throw new AppError('Campanha nao encontrada', 404, 'CAMPAIGN_NOT_FOUND');
      }

      if (campaign.status !== 'active') {
        throw new AppError('Campanha indisponivel para adesao', 409, 'CAMPAIGN_NOT_ACTIVE');
      }

      const today = currentDateKey();
      const startDate = campaign.start_date?.slice(0, 10);
      const endDate = campaign.end_date?.slice(0, 10);

      if (startDate && startDate > today) {
        throw new AppError('Campanha ainda nao iniciou', 409, 'CAMPAIGN_NOT_STARTED');
      }

      if (endDate && endDate < today) {
        throw new AppError('Campanha encerrada', 409, 'CAMPAIGN_ENDED');
      }

      db.prepare('INSERT OR IGNORE INTO user_campaigns (user_id, campaign_id, progress) VALUES (?, ?, 0)')
        .run(input.userId, input.campaignId);
    });

    guardedJoin.immediate();
  });
}

export async function createCampaign(data: {
  name: string;
  month: string;
  color: string;
  status: string;
  statusLabel?: string;
  companyId: string;
  start_date?: string;
  end_date?: string;
  theme?: string;
  theme_color?: string;
}): Promise<CampaignRow> {
  const writeQueue = getWriteQueue();
  const id = `camp_${Math.random().toString(36).slice(2, 9)}`;

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO campaigns (id, name, month, color, status, status_label, company_id, start_date, end_date, theme, theme_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.name, data.month, data.color, data.status,
      data.statusLabel || 'Próxima', data.companyId,
      data.start_date || null, data.end_date || null,
      data.theme || null, data.theme_color || null
    );

    return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as CampaignRow;
  });
}
