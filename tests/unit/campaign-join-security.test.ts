import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ db: null as Database.Database | null }));

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return { withAuth: expose };
});
vi.mock('@/lib/db/init', () => ({ initDb: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    if (!runtime.db) throw new Error('runtime database not configured');
    return runtime.db;
  },
  getWriteQueue: () => ({
    enqueue: async (operation: (db: Database.Database) => unknown) => {
      if (!runtime.db) throw new Error('runtime database not configured');
      return operation(runtime.db);
    },
  }),
}));

import { POST as joinCampaign } from '@/app/api/campaigns/join/route';
import { countActiveCampaigns } from '@/repositories/campaign.repository';

const collaboratorAuth = {
  userId: 'user-1',
  companyId: 'company-1',
  role: 'colaboradora',
  email: 'ana@example.test',
};

function useCampaignDatabase() {
  const db = new Database(':memory:');
  runtime.db = db;
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      role TEXT NOT NULL,
      also_collaborator INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 1,
      blocked INTEGER DEFAULT 0,
      deleted_at TEXT
    );
    CREATE TABLE campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      month TEXT NOT NULL,
      color TEXT NOT NULL,
      status TEXT DEFAULT 'next' CHECK(status IN ('done', 'active', 'next')),
      status_label TEXT,
      company_id TEXT,
      created_at TEXT DEFAULT '2026-07-01',
      start_date TEXT,
      end_date TEXT,
      theme TEXT,
      theme_color TEXT
    );
    CREATE TABLE user_campaigns (
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, campaign_id)
    );

    INSERT INTO users (id, company_id, role, also_collaborator) VALUES
      ('user-1', 'company-1', 'colaboradora', 0),
      ('leader-no-capability', 'company-1', 'lideranca', 0);

    INSERT INTO campaigns (id, name, month, color, status, status_label, company_id, start_date, end_date) VALUES
      ('active-company', 'Campanha ativa', 'Jul', '#3E7D5A', 'active', 'Ativa', 'company-1', '2026-07-01', '2026-07-31'),
      ('foreign-company', 'Campanha externa', 'Jul', '#3E7D5A', 'active', 'Ativa', 'company-2', '2026-07-01', '2026-07-31'),
      ('inactive-next', 'Campanha inativa', 'Jul', '#3E7D5A', 'next', 'Proxima', 'company-1', '2026-07-01', '2026-07-31'),
      ('future-active', 'Campanha futura', 'Ago', '#3E7D5A', 'active', 'Ativa', 'company-1', '2026-08-01', '2026-08-31'),
      ('done-campaign', 'Campanha concluida', 'Jun', '#3E7D5A', 'done', 'Concluida', 'company-1', '2026-06-01', '2026-06-30');
  `);
  return db;
}

async function postJoin(campaignId: string, auth = collaboratorAuth) {
  return joinCampaign(new Request('http://localhost/api/campaigns/join', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ campaignId }),
  }) as any, { auth } as any);
}

function joinedRows(db: Database.Database) {
  return db.prepare('SELECT user_id, campaign_id, progress FROM user_campaigns ORDER BY campaign_id').all();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-27T12:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  runtime.db?.close();
  runtime.db = null;
});

describe('campaign join authorization and lifecycle', () => {
  it('allows a collaborator to join an active campaign from the authenticated company', async () => {
    const db = useCampaignDatabase();

    const response = await postJoin('active-company');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, progressRecorded: true });
    expect(joinedRows(db)).toEqual([{ user_id: 'user-1', campaign_id: 'active-company', progress: 0 }]);
  });

  it('does not join a campaign from another company', async () => {
    const db = useCampaignDatabase();

    const response = await postJoin('foreign-company');

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'CAMPAIGN_NOT_FOUND' });
    expect(joinedRows(db)).toEqual([]);
  });

  it.each([
    ['inactive-next', 'CAMPAIGN_NOT_ACTIVE'],
    ['future-active', 'CAMPAIGN_NOT_STARTED'],
    ['done-campaign', 'CAMPAIGN_NOT_ACTIVE'],
  ])('does not join unavailable campaign %s', async (campaignId, code) => {
    const db = useCampaignDatabase();

    const response = await postJoin(campaignId);

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code });
    expect(joinedRows(db)).toEqual([]);
  });

  it('requires persisted collaborator capability before joining', async () => {
    const db = useCampaignDatabase();

    const response = await postJoin('active-company', {
      ...collaboratorAuth,
      userId: 'leader-no-capability',
      role: 'lideranca',
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: 'COLLABORATOR_CAPABILITY_REQUIRED' });
    expect(joinedRows(db)).toEqual([]);
  });

  it('counts only active campaigns inside the temporal window', () => {
    useCampaignDatabase();

    expect(countActiveCampaigns('company-1')).toBe(1);
  });
});
