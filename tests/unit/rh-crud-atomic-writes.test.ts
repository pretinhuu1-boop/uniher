import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const deps = vi.hoisted(() => ({
  auth: {
    userId: 'rh-1',
    companyId: 'company-a',
    role: 'rh',
    isMasterAdmin: false,
  },
  beforeWrite: null as (() => void) | null,
  db: null as Database.Database | null,
  enqueueOptions: [] as Array<{ retryOnFailure?: boolean } | undefined>,
  immediateCalls: 0,
  writeSql: [] as string[],
  logAudit: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => handler(req, {
    params: segment.params ?? Promise.resolve({}),
    auth: deps.auth,
  }),
  withRole: () => (handler: any) => (
    req: NextRequest,
    segment: { params?: Promise<Record<string, string>> } = {},
  ) => handler(req, {
    params: segment.params ?? Promise.resolve({}),
    auth: deps.auth,
  }),
}));

vi.mock('@/lib/db', () => ({
  getReadDb: () => deps.db,
  getWriteQueue: () => ({
    enqueue: async (
      operation: (db: Database.Database) => unknown,
      _label?: string,
      options?: { retryOnFailure?: boolean },
    ) => {
      if (!deps.db) throw new Error('Test database not initialized');
      deps.enqueueOptions.push(options);
      deps.beforeWrite?.();
      deps.beforeWrite = null;

      const realDb = deps.db;
      const writeDb = {
        prepare(sql: string) {
          deps.writeSql.push(sql.replace(/\s+/g, ' ').trim());
          return realDb.prepare(sql);
        },
        transaction(operationBody: () => unknown) {
          const transaction = realDb.transaction(operationBody);
          return {
            immediate() {
              deps.immediateCalls += 1;
              return transaction.immediate();
            },
          };
        },
      } as unknown as Database.Database;

      return operation(writeDb);
    },
  }),
}));

vi.mock('@/lib/db/init', () => ({ initDb: vi.fn() }));
vi.mock('@/lib/security/rate-limit', () => ({
  checkReadRateLimit: vi.fn(),
  checkWriteRateLimit: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ logAudit: deps.logAudit }));

import {
  DELETE as deleteCampaign,
  PATCH as updateCampaign,
} from '@/app/api/campaigns/[id]/route';
import { POST as createCampaign } from '@/app/api/campaigns/route';
import { POST as createLegacyDepartment } from '@/app/api/departments/route';
import {
  POST as createDepartment,
} from '@/app/api/rh/departments/route';
import {
  DELETE as deleteDepartment,
  PATCH as updateDepartment,
} from '@/app/api/rh/departments/[id]/route';
import { POST as createLeague } from '@/app/api/rh/leagues/route';
import {
  DELETE as deleteLeague,
  PATCH as updateLeague,
} from '@/app/api/rh/leagues/[id]/route';
import {
  GET as listLessons,
  POST as createLesson,
} from '@/app/api/rh/lessons/route';
import {
  DELETE as deleteLesson,
  PATCH as updateLesson,
} from '@/app/api/rh/lessons/[id]/route';
import { PATCH as updateGamificationConfig } from '@/app/api/gamification/config/route';
import { POST as createReward } from '@/app/api/gamification/rewards/route';
import {
  DELETE as deleteChallenge,
  PATCH as updateChallenge,
} from '@/app/api/rh/challenges/[id]/route';
import { POST as createChallenge } from '@/app/api/rh/challenges/route';
import { PATCH as updateAlertPreferences } from '@/app/api/rh/alert-preferences/route';

function request(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('RH CRUD atomic write boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.auth.userId = 'rh-1';
    deps.auth.companyId = 'company-a';
    deps.auth.role = 'rh';
    deps.beforeWrite = null;
    deps.enqueueOptions.length = 0;
    deps.immediateCalls = 0;
    deps.writeSql.length = 0;
    deps.db = new Database(':memory:');
    deps.db.exec(`
      CREATE TABLE companies (
        id TEXT PRIMARY KEY,
        is_active INTEGER,
        deleted_at TEXT
      );
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        department_id TEXT,
        role TEXT,
        is_master_admin INTEGER DEFAULT 0,
        approved INTEGER,
        blocked INTEGER,
        deleted_at TEXT,
        name TEXT,
        points INTEGER DEFAULT 0
      );
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT,
        month TEXT,
        status TEXT,
        color TEXT,
        status_label TEXT,
        start_date TEXT,
        end_date TEXT,
        theme TEXT,
        theme_color TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE departments (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT,
        color TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE custom_leagues (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        name TEXT,
        description TEXT,
        type TEXT,
        department_id TEXT,
        icon TEXT,
        color TEXT,
        created_by TEXT,
        is_active INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
      );
      CREATE TABLE custom_league_members (
        id TEXT PRIMARY KEY,
        league_id TEXT,
        user_id TEXT,
        week_points INTEGER,
        week_start TEXT,
        UNIQUE(league_id, user_id)
      );
      CREATE TABLE daily_lessons (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        title TEXT,
        description TEXT,
        type TEXT,
        theme TEXT,
        week_number INTEGER,
        day_of_week INTEGER,
        order_index INTEGER,
        xp_reward INTEGER,
        duration_seconds INTEGER,
        active INTEGER,
        campaign_context TEXT,
        content_json TEXT,
        updated_at TEXT
      );
      CREATE TABLE gamification_config (
        company_id TEXT PRIMARY KEY,
        xp_checkin INTEGER,
        xp_lesson INTEGER,
        xp_quiz INTEGER,
        xp_challenge INTEGER,
        xp_exam INTEGER,
        streak_notifications INTEGER,
        streak_min_days INTEGER,
        hearts_enabled INTEGER,
        hearts_per_day INTEGER,
        hearts_refill_hours INTEGER,
        league_enabled INTEGER,
        league_anonymous INTEGER,
        daily_xp_goal INTEGER,
        active_themes TEXT,
        theme_order TEXT,
        updated_at TEXT
      );
      CREATE TABLE rewards (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        title TEXT,
        description TEXT,
        points_cost INTEGER,
        type TEXT,
        quantity_available INTEGER,
        active INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE challenges (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        category TEXT,
        points INTEGER,
        total_steps INTEGER,
        deadline TEXT,
        company_id TEXT,
        created_by TEXT,
        is_default INTEGER,
        is_active INTEGER,
        overridden_from TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
      );
      CREATE TABLE alert_preferences (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        alert_type TEXT,
        days_before INTEGER,
        enabled INTEGER,
        updated_at TEXT
      );

      INSERT INTO companies VALUES
        ('company-a', 1, NULL),
        ('company-b', 1, NULL);
      INSERT INTO users (
        id, company_id, department_id, role, is_master_admin,
        approved, blocked, deleted_at, name
      ) VALUES
        ('rh-1', 'company-a', NULL, 'rh', 0, 1, 1, NULL, 'Revoked RH'),
        ('admin-1', 'company-a', NULL, 'admin', 1, 1, 1, NULL, 'Revoked Admin'),
        ('leader-1', 'company-a', NULL, 'lideranca', 0, 1, 1, NULL, 'Revoked Leader'),
        ('user-a', 'company-a', 'department-delete', 'colaboradora', 0, 1, 0, NULL, 'User A'),
        ('user-b', 'company-b', 'department-b', 'colaboradora', 0, 1, 0, NULL, 'User B');
      INSERT INTO campaigns (id, company_id, name, month, status) VALUES
        ('campaign-update', 'company-a', 'Original campaign', '', 'active'),
        ('campaign-delete', 'company-a', 'Delete campaign', '', 'active'),
        ('campaign-race', 'company-a', 'Race campaign', '', 'active');
      INSERT INTO departments (id, company_id, name, color) VALUES
        ('department-update', 'company-a', 'Original department', '#000000'),
        ('department-delete', 'company-a', 'Delete department', '#000000'),
        ('department-b', 'company-b', 'Foreign department', '#000000');
      INSERT INTO custom_leagues (
        id, company_id, name, type, is_active
      ) VALUES
        ('league-update', 'company-a', 'Original league', 'opt_in', 1),
        ('league-delete', 'company-a', 'Delete league', 'opt_in', 1);
      INSERT INTO daily_lessons (
        id, company_id, title, description, type, theme, week_number,
        day_of_week, order_index, xp_reward, duration_seconds, active, content_json
      ) VALUES
        ('lesson-update', 'company-a', 'Original lesson', 'Description', 'quiz', 'geral', 1, 1, 0, 20, 120, 1, '{}'),
        ('lesson-delete', 'company-a', 'Delete lesson', 'Description', 'quiz', 'geral', 1, 2, 0, 20, 120, 1, '{}');
      INSERT INTO gamification_config (
        company_id, xp_checkin, xp_lesson, xp_quiz, xp_challenge, xp_exam,
        streak_notifications, streak_min_days, hearts_enabled, hearts_per_day,
        hearts_refill_hours, league_enabled, league_anonymous, daily_xp_goal,
        active_themes, theme_order
      ) VALUES (
        'company-a', 50, 20, 30, 40, 100, 1, 3, 0, 5, 24, 1, 0, 50, '[]', '[]'
      );
      INSERT INTO challenges (
        id, title, description, category, points, total_steps, company_id,
        created_by, is_default, is_active
      ) VALUES
        ('challenge-update', 'Original challenge', 'Description', 'geral', 10, 1, 'company-a', 'rh-1', 0, 1),
        ('challenge-delete', 'Delete challenge', 'Description', 'geral', 10, 1, 'company-a', 'rh-1', 0, 1),
        ('challenge-default', 'Default challenge', 'Description', 'geral', 10, 1, NULL, NULL, 1, 0);
    `);
  });

  afterEach(() => {
    deps.db?.close();
    deps.db = null;
  });

  it('keeps the valid RH management CRUD paths operational', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');
    const responses = [
      await createCampaign(
        request('/api/campaigns', 'POST', { name: 'Valid campaign', color: '#000000' }),
        params('unused'),
      ),
      await updateCampaign(
        request('/api/campaigns/campaign-update', 'PATCH', { name: 'Updated campaign' }),
        params('campaign-update'),
      ),
      await deleteCampaign(request('/api/campaigns/campaign-delete', 'DELETE'), params('campaign-delete')),
      await createDepartment(
        request('/api/rh/departments', 'POST', { name: 'Valid department' }),
        params('unused'),
      ),
      await createLegacyDepartment(
        request('/api/departments', 'POST', { name: 'Valid legacy department' }),
        params('unused'),
      ),
      await updateDepartment(
        request('/api/rh/departments/department-update', 'PATCH', { name: 'Updated department' }),
        params('department-update'),
      ),
      await deleteDepartment(
        request('/api/rh/departments/department-delete', 'DELETE'),
        params('department-delete'),
      ),
      await createLeague(
        request('/api/rh/leagues', 'POST', { name: 'Valid league' }),
        params('unused'),
      ),
      await updateLeague(
        request('/api/rh/leagues/league-update', 'PATCH', { name: 'Updated league' }),
        params('league-update'),
      ),
      await deleteLeague(request('/api/rh/leagues/league-delete', 'DELETE'), params('league-delete')),
      await createLesson(
        request('/api/rh/lessons', 'POST', {
          title: 'Valid lesson',
          description: 'Description',
          type: 'quiz',
          theme: 'geral',
          content_json: {},
        }),
        params('unused'),
      ),
      await updateLesson(
        request('/api/rh/lessons/lesson-update', 'PATCH', { title: 'Updated lesson' }),
        params('lesson-update'),
      ),
      await deleteLesson(request('/api/rh/lessons/lesson-delete', 'DELETE'), params('lesson-delete')),
      await updateGamificationConfig(
        request('/api/gamification/config', 'PATCH', { xp_checkin: 75 }),
        params('unused'),
      ),
      await createReward(
        request('/api/gamification/rewards', 'POST', { title: 'Valid reward', points_cost: 10 }),
        params('unused'),
      ),
      await createChallenge(
        request('/api/rh/challenges', 'POST', {
          title: 'Valid challenge',
          description: 'Description',
          category: 'geral',
          points: 10,
          total_steps: 1,
        }),
        params('unused'),
      ),
      await updateChallenge(
        request('/api/rh/challenges/challenge-update', 'PATCH', { action: 'update', title: 'Updated challenge' }),
        params('challenge-update'),
      ),
      await deleteChallenge(request('/api/rh/challenges/challenge-delete', 'DELETE'), params('challenge-delete')),
      await updateAlertPreferences(
        request('/api/rh/alert-preferences', 'PATCH', { alert_type: 'exame', enabled: true }),
        params('unused'),
      ),
    ];

    expect(responses.map((response) => response.status)).toEqual([
      201, 200, 200, 200, 201, 200, 200, 200, 200, 200,
      201, 200, 200, 200, 201, 200, 200, 200, 200,
    ]);
    expect(deps.enqueueOptions).toHaveLength(19);
    expect(deps.enqueueOptions.every((options) => options?.retryOnFailure === false)).toBe(true);
    expect(deps.immediateCalls).toBe(19);
  });

  it('rejects every RH CRUD mutation when the persisted actor is revoked', async () => {
    const responses = await Promise.all([
      createCampaign(
        request('/api/campaigns', 'POST', {
          name: 'New campaign',
          color: '#000000',
        }),
        params('unused'),
      ),
      updateCampaign(
        request('/api/campaigns/campaign-update', 'PATCH', { name: 'Changed campaign' }),
        params('campaign-update'),
      ),
      deleteCampaign(
        request('/api/campaigns/campaign-delete', 'DELETE'),
        params('campaign-delete'),
      ),
      createDepartment(
        request('/api/rh/departments', 'POST', { name: 'New department' }),
        params('unused'),
      ),
      createLegacyDepartment(
        request('/api/departments', 'POST', { name: 'New legacy department' }),
        params('unused'),
      ),
      updateDepartment(
        request('/api/rh/departments/department-update', 'PATCH', { name: 'Changed department' }),
        params('department-update'),
      ),
      deleteDepartment(
        request('/api/rh/departments/department-delete', 'DELETE'),
        params('department-delete'),
      ),
      createLeague(
        request('/api/rh/leagues', 'POST', { name: 'New league' }),
        params('unused'),
      ),
      updateLeague(
        request('/api/rh/leagues/league-update', 'PATCH', { name: 'Changed league' }),
        params('league-update'),
      ),
      deleteLeague(
        request('/api/rh/leagues/league-delete', 'DELETE'),
        params('league-delete'),
      ),
      createLesson(
        request('/api/rh/lessons', 'POST', {
          title: 'New lesson',
          description: 'Description',
          type: 'quiz',
          theme: 'geral',
          content_json: {},
        }),
        params('unused'),
      ),
      updateLesson(
        request('/api/rh/lessons/lesson-update', 'PATCH', { title: 'Changed lesson' }),
        params('lesson-update'),
      ),
      deleteLesson(
        request('/api/rh/lessons/lesson-delete', 'DELETE'),
        params('lesson-delete'),
      ),
      updateGamificationConfig(
        request('/api/gamification/config', 'PATCH', { xp_checkin: 99 }),
        params('unused'),
      ),
      createReward(
        request('/api/gamification/rewards', 'POST', { title: 'Reward', points_cost: 10 }),
        params('unused'),
      ),
      createChallenge(
        request('/api/rh/challenges', 'POST', {
          title: 'New challenge',
          description: 'Description',
          category: 'geral',
          points: 10,
          total_steps: 1,
        }),
        params('unused'),
      ),
      updateChallenge(
        request('/api/rh/challenges/challenge-update', 'PATCH', { action: 'update', title: 'Changed challenge' }),
        params('challenge-update'),
      ),
      deleteChallenge(
        request('/api/rh/challenges/challenge-delete', 'DELETE'),
        params('challenge-delete'),
      ),
      updateAlertPreferences(
        request('/api/rh/alert-preferences', 'PATCH', {
          alert_type: 'exame',
          days_before: 5,
          enabled: true,
        }),
        params('unused'),
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual(Array(19).fill(409));
    expect(deps.enqueueOptions).toHaveLength(19);
    expect(deps.enqueueOptions.every((options) => options?.retryOnFailure === false)).toBe(true);
    expect(deps.immediateCalls).toBe(19);
    expect(deps.writeSql.some((sql) => /^(INSERT|UPDATE|DELETE)/i.test(sql))).toBe(false);
    expect(deps.logAudit).not.toHaveBeenCalled();
  });

  it('does not provision lessons from GET after RH authorization is revoked', async () => {
    const response = await listLessons(
      request('/api/rh/lessons?week=20', 'GET'),
      params('unused'),
    );
    const count = deps.db!.prepare('SELECT COUNT(*) AS count FROM daily_lessons').get() as { count: number };

    expect(response.status).toBe(409);
    expect(count.count).toBe(2);
    expect(deps.enqueueOptions.every((options) => options?.retryOnFailure === false)).toBe(true);
  });

  it('revalidates non-RH management actors on the two legacy multi-role writes', async () => {
    deps.auth.userId = 'leader-1';
    deps.auth.role = 'lideranca';
    const preferenceResponse = await updateAlertPreferences(
      request('/api/rh/alert-preferences', 'PATCH', {
        alert_type: 'consulta',
        enabled: false,
      }),
      params('unused'),
    );

    deps.auth.userId = 'admin-1';
    deps.auth.role = 'admin';
    const departmentResponse = await createLegacyDepartment(
      request('/api/departments', 'POST', { name: 'Admin department' }),
      params('unused'),
    );

    expect(preferenceResponse.status).toBe(409);
    expect(departmentResponse.status).toBe(409);
    expect(deps.db!.prepare('SELECT COUNT(*) AS count FROM alert_preferences').get()).toEqual({ count: 0 });
    expect(deps.db!.prepare("SELECT COUNT(*) AS count FROM departments WHERE name = 'Admin department'").get()).toEqual({ count: 0 });
    expect(deps.enqueueOptions).toEqual([
      { retryOnFailure: false },
      { retryOnFailure: false },
    ]);
    expect(deps.immediateCalls).toBe(2);
  });

  it('revalidates a campaign target inside the immediate transaction', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');
    deps.beforeWrite = () => {
      deps.db!.prepare('UPDATE campaigns SET company_id = ? WHERE id = ?')
        .run('company-b', 'campaign-race');
    };

    const response = await updateCampaign(
      request('/api/campaigns/campaign-race', 'PATCH', { name: 'Cross-tenant write' }),
      params('campaign-race'),
    );
    const campaign = deps.db!.prepare('SELECT company_id, name FROM campaigns WHERE id = ?')
      .get('campaign-race') as { company_id: string; name: string };

    expect(response.status).toBe(409);
    expect(campaign).toEqual({ company_id: 'company-b', name: 'Race campaign' });
    expect(deps.immediateCalls).toBe(1);
    expect(deps.enqueueOptions).toEqual([{ retryOnFailure: false }]);
  });

  it('rejects a department league when the department belongs to another tenant', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');

    const response = await createLeague(
      request('/api/rh/leagues', 'POST', {
        name: 'Foreign department league',
        type: 'department',
        department_id: 'department-b',
      }),
      params('unused'),
    );
    const league = deps.db!.prepare('SELECT id FROM custom_leagues WHERE name = ?')
      .get('Foreign department league');

    expect(response.status).toBe(409);
    expect(league).toBeUndefined();
    expect(deps.writeSql.some((sql) => (
      sql.includes('FROM departments') && sql.includes('company_id = ?')
    ))).toBe(true);
  });

  it('never changes a global challenge directly from the RH route', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');

    const response = await updateChallenge(
      request('/api/rh/challenges/challenge-default', 'PATCH', { action: 'activate' }),
      params('challenge-default'),
    );
    const challenge = deps.db!.prepare('SELECT is_active FROM challenges WHERE id = ?')
      .get('challenge-default') as { is_active: number };

    expect(response.status).toBe(403);
    expect(challenge.is_active).toBe(0);
    expect(deps.writeSql.some((sql) => (
      sql.startsWith('UPDATE challenges') && !sql.includes('company_id = ?')
    ))).toBe(false);
  });

  it('deactivates a default challenge with a company-scoped override', async () => {
    deps.db!.prepare('UPDATE users SET blocked = 0 WHERE id = ?').run('rh-1');
    deps.db!.prepare('UPDATE challenges SET is_active = 1 WHERE id = ?').run('challenge-default');

    const response = await updateChallenge(
      request('/api/rh/challenges/challenge-default', 'PATCH', { action: 'deactivate' }),
      params('challenge-default'),
    );
    const globalChallenge = deps.db!.prepare('SELECT is_active FROM challenges WHERE id = ?')
      .get('challenge-default') as { is_active: number };
    const override = deps.db!.prepare(`
      SELECT company_id, is_default, is_active, overridden_from
      FROM challenges
      WHERE company_id = ? AND overridden_from = ?
    `).get('company-a', 'challenge-default');

    expect(response.status).toBe(200);
    expect(globalChallenge.is_active).toBe(1);
    expect(override).toEqual({
      company_id: 'company-a',
      is_default: 0,
      is_active: 0,
      overridden_from: 'challenge-default',
    });
  });
});
