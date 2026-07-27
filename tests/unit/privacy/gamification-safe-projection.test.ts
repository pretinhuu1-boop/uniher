import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({
  db: null as Database.Database | null,
  sql: [] as string[],
  events: [] as string[],
  dedicatedReadOpenCount: 0,
  dedicatedReadCloseCount: 0,
  dedicatedPrepareCount: 0,
  failDedicatedReadAfterPrepareCount: null as number | null,
}));

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return { withAuth: expose, withRole: () => expose, withMasterAdmin: expose };
});
vi.mock('@/lib/db/init', () => ({
  initDb: async () => { boundary.events.push('initDb'); },
}));
vi.mock('@/lib/security/rate-limit', () => ({
  checkAuthRateLimit: async () => undefined,
  checkReadRateLimit: async () => undefined,
  recordFailedAuth: async () => undefined,
}));
vi.mock('@/lib/auth/password', () => ({
  hashPassword: async (password: string) => `hashed:${password}`,
  verifyPassword: async (password: string, hash: string) => hash === `hashed:${password}`,
}));
vi.mock('@/lib/auth/jwt', () => ({
  signAccessToken: async () => 'access-token',
  signRefreshToken: async () => 'refresh-token',
}));
vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookiesOnResponse: (response: Response) => response,
  getRefreshTokenCookie: async () => undefined,
}));
vi.mock('@/lib/audit', () => ({ logAudit: async () => undefined }));
vi.mock('@/lib/db', () => ({
  getReadDb: () => {
    boundary.events.push('getReadDb');
    return {
      prepare: (sql: string) => {
        boundary.sql.push(sql);
        if (!boundary.db) throw new Error('boundary database not configured');
        return boundary.db.prepare(sql);
      },
    };
  },
  getWriteQueue: () => {
    boundary.events.push('getWriteQueue');
    return {
      enqueue: async (operation: (db: Database.Database) => unknown) => {
        if (!boundary.db) throw new Error('boundary database not configured');
        return operation(boundary.db);
      },
    };
  },
  openReadOnlyDb: () => {
    boundary.events.push('openReadOnlyDb');
    boundary.dedicatedReadOpenCount += 1;
    let closed = false;
    return {
      prepare: (sql: string) => {
        boundary.sql.push(sql);
        boundary.dedicatedPrepareCount += 1;
        if (
          boundary.failDedicatedReadAfterPrepareCount !== null
          && boundary.dedicatedPrepareCount > boundary.failDedicatedReadAfterPrepareCount
        ) {
          throw new Error('dedicated read failure');
        }
        if (!boundary.db) throw new Error('boundary database not configured');
        return boundary.db.prepare(sql);
      },
      close: () => {
        if (closed) return;
        closed = true;
        boundary.dedicatedReadCloseCount += 1;
      },
    };
  },
}));

import { GET as getCollaboratorHome } from '@/app/api/collaborator/route';
import * as configRoute from '@/app/api/gamification/config/route';
import { GET as getDsarExport } from '@/app/api/users/me/export/route';
import { POST as registerUser } from '@/app/api/auth/register/route';
import { POST as loginUser } from '@/app/api/auth/login/route';
import { GET as getAuthMe } from '@/app/api/auth/me/route';
import { GET as getUserMe } from '@/app/api/users/me/route';
import { GET as getCompany } from '@/app/api/company/route';
import { GET as getLeaderTeam } from '@/app/api/leader/team/route';
import { GET as getRhUsers } from '@/app/api/rh/users/route';
import { GET as getAdminUsers } from '@/app/api/admin/users/route';
import { GET as getAdminCompanyUsers } from '@/app/api/admin/companies/[id]/users/route';
import { GET as getNotifications } from '@/app/api/notifications/route';
import { GET as getNotificationCount } from '@/app/api/notifications/count/route';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const forbiddenKeys = new Set([
  'password_hash', 'points', 'level', 'league', 'streak', 'week_points', 'points_spent', 'xp', 'xp_reward', 'badges', 'user_badges',
  'pointsnextlevel', 'achievementcount', 'levelinfo', 'pointsearned', 'currentleague', 'weekpoints',
]);

const auth = {
  userId: 'user-1', role: 'colaboradora', companyId: 'company-1', email: 'ana@example.test',
};

afterEach(() => {
  boundary.db?.close();
  boundary.db = null;
  boundary.sql = [];
  boundary.events = [];
  boundary.dedicatedReadOpenCount = 0;
  boundary.dedicatedReadCloseCount = 0;
  boundary.dedicatedPrepareCount = 0;
  boundary.failDedicatedReadAfterPrepareCount = null;
});

function useBoundaryDatabase() {
  const db = new Database(':memory:');
  boundary.db = db;
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, company_id TEXT, department_id TEXT, name TEXT, nickname TEXT,
      email TEXT UNIQUE, password_hash TEXT, role TEXT, avatar_url TEXT,
      is_master_admin INTEGER DEFAULT 0, blocked INTEGER DEFAULT 0, approved INTEGER DEFAULT 1,
      must_change_password INTEGER DEFAULT 0, emergency_contact_name TEXT, emergency_contact_phone TEXT,
      last_active TEXT, also_collaborator INTEGER DEFAULT 0, can_approve INTEGER DEFAULT 0,
      points INTEGER DEFAULT 731, level INTEGER DEFAULT 8, league TEXT DEFAULT 'ouro', streak INTEGER DEFAULT 12,
      week_points INTEGER DEFAULT 99, xp INTEGER DEFAULT 88, xp_reward INTEGER DEFAULT 77,
      badges TEXT DEFAULT 'CANARY_BADGES', daily_xp_goal INTEGER DEFAULT 50,
      daily_xp_earned INTEGER DEFAULT 44, daily_xp_date TEXT,
      created_at TEXT DEFAULT '2026-01-01', updated_at TEXT DEFAULT '2026-01-02', deleted_at TEXT
    );
    CREATE TABLE dsar_export_cooldowns (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      next_allowed_at INTEGER NOT NULL CHECK(next_allowed_at >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      reservation_token TEXT,
      status TEXT NOT NULL DEFAULT 'completed'
        CHECK(status IN ('in_progress', 'completed', 'failed', 'cancelled'))
    );
    CREATE TABLE departments (id TEXT PRIMARY KEY, company_id TEXT, name TEXT);
    CREATE TABLE companies (
      id TEXT PRIMARY KEY, name TEXT, trade_name TEXT, cnpj TEXT, sector TEXT, plan TEXT,
      is_active INTEGER, logo_url TEXT, primary_color TEXT, secondary_color TEXT,
      contact_name TEXT, contact_email TEXT, contact_phone TEXT, badges TEXT, xp_reward INTEGER,
      created_at TEXT, updated_at TEXT
    );
    CREATE TABLE company_settings (id TEXT PRIMARY KEY, company_id TEXT, setting_key TEXT, setting_value TEXT, updated_at TEXT, UNIQUE(company_id, setting_key));
    CREATE TABLE user_preferences (user_id TEXT, pref_key TEXT, pref_value TEXT, updated_at TEXT, UNIQUE(user_id, pref_key));
    CREATE TABLE refresh_tokens (id TEXT PRIMARY KEY, user_id TEXT, token_hash TEXT, expires_at TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE user_exams (id TEXT PRIMARY KEY, user_id TEXT, status TEXT);
    CREATE TABLE campaigns (id TEXT PRIMARY KEY, company_id TEXT, status TEXT, created_at TEXT);
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT, read INTEGER,
      created_at TEXT, source TEXT, resource_id TEXT
    );
    CREATE TABLE badges (id TEXT PRIMARY KEY, name TEXT, description TEXT, icon TEXT, points INTEGER, rarity TEXT, created_at TEXT);
    CREATE TABLE user_badges (user_id TEXT, badge_id TEXT, unlocked_at TEXT);
    CREATE TABLE challenges (id TEXT PRIMARY KEY, title TEXT, description TEXT, category TEXT, points INTEGER, total_steps INTEGER, deadline TEXT, created_at TEXT);
    CREATE TABLE user_challenges (user_id TEXT, challenge_id TEXT, progress INTEGER, status TEXT, started_at TEXT, completed_at TEXT);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT, dimension TEXT, score REAL, status TEXT, recorded_at TEXT);
    CREATE TABLE quiz_results (id TEXT PRIMARY KEY, user_id TEXT, archetype_id TEXT, answers_json TEXT, created_at TEXT);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, target_type TEXT, target_id TEXT, points_earned INTEGER, created_at TEXT);
    CREATE TABLE mission_logs (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, action TEXT, day TEXT, mood TEXT, glasses INTEGER, challenge_id TEXT, note TEXT, created_at TEXT);
    CREATE TABLE gamification_config (
      company_id TEXT PRIMARY KEY, active_themes TEXT, theme_order TEXT, hearts_enabled INTEGER,
      hearts_per_day INTEGER, hearts_refill_hours INTEGER, updated_at TEXT
    );
    INSERT INTO departments VALUES ('department-1', 'company-1', 'Produto');
    INSERT INTO companies VALUES ('company-1', 'UniHER', 'UniHER', '00.000.000/0001-00', 'Saude', 'pro', 1, NULL, NULL, NULL, 'Contato', 'contato@example.test', NULL, 'CANARY_COMPANY_BADGES', 66, '2026-01-01', '2026-01-02');
    INSERT INTO company_settings VALUES ('setting-1', 'company-1', 'feed_company_enabled', '1', '2026-01-01');
    INSERT INTO users (id, company_id, department_id, name, nickname, email, password_hash, role, is_master_admin, can_approve)
      VALUES ('user-1', 'company-1', 'department-1', 'Ana Silva', 'Ana', 'ana@example.test', 'hashed:Password1!', 'colaboradora', 0, 0);
    INSERT INTO users (id, company_id, department_id, name, nickname, email, password_hash, role, is_master_admin, can_approve)
      VALUES ('leader-1', 'company-1', 'department-1', 'Lia Lider', 'Lia', 'lia@example.test', 'hashed:Password1!', 'lideranca', 0, 1);
    INSERT INTO users (id, company_id, department_id, name, nickname, email, password_hash, role, is_master_admin, can_approve)
      VALUES ('rh-1', 'company-1', 'department-1', 'Rita RH', 'Rita', 'rita@example.test', 'hashed:Password1!', 'rh', 0, 0);
    INSERT INTO users (id, company_id, department_id, name, nickname, email, password_hash, role, is_master_admin, can_approve)
      VALUES ('admin-1', NULL, NULL, 'Ada Admin', 'Ada', 'ada@example.test', 'hashed:Password1!', 'admin', 1, 0);
    INSERT INTO user_preferences VALUES ('user-1', 'first_access_tour_completed', '1', '2026-01-01');
    INSERT INTO user_exams VALUES ('exam-1', 'user-1', 'completed');
    INSERT INTO campaigns VALUES ('campaign-1', 'company-1', 'active', '2026-01-01');
    INSERT INTO notifications VALUES ('notification-1', 'user-1', 'campaign', 'Campanha', 'Conteudo seguro', 0, '2026-01-01', NULL, NULL);
    INSERT INTO notifications VALUES ('notification-2', 'user-1', 'badge', 'CANARY_BADGE', 'CANARY_LEGACY_BADGE', 0, '2026-01-02', NULL, NULL);
    INSERT INTO notifications VALUES ('notification-3', 'user-1', 'level', 'CANARY_LEVEL', 'CANARY_LEGACY_LEVEL', 0, '2026-01-03', NULL, NULL);
    INSERT INTO notifications VALUES ('notification-4', 'user-1', 'streak', 'CANARY_STREAK', 'CANARY_LEGACY_STREAK', 0, '2026-01-04', NULL, NULL);
    INSERT INTO notifications VALUES ('notification-5', 'user-1', 'gamification', 'CANARY_GAME', 'CANARY_LEGACY_GAME', 0, '2026-01-05', NULL, NULL);
    INSERT INTO notifications VALUES ('notification-6', 'user-1', 'reward', 'CANARY_REWARD', 'CANARY_LEGACY_REWARD', 0, '2026-01-06', NULL, NULL);
    INSERT INTO badges VALUES ('badge-1', 'Legado', 'Legado', 'x', 50, 'common', '2026-01-01');
    INSERT INTO user_badges VALUES ('user-1', 'badge-1', '2026-01-01');
    INSERT INTO challenges VALUES ('challenge-1', 'Legado', 'Legado', 'legacy', 40, 1, NULL, '2026-01-01');
    INSERT INTO user_challenges VALUES ('user-1', 'challenge-1', 1, 'active', '2026-01-01', NULL);
    INSERT INTO health_scores VALUES ('health-1', 'user-1', 'Sono', 88, 'green', '2026-01-01');
    INSERT INTO quiz_results VALUES ('quiz-1', 'user-1', 'arch-1', '{}', '2026-01-01');
    INSERT INTO activity_log VALUES ('activity-1', 'user-1', 'legacy', 'lesson', 'lesson-1', 50, '2026-01-01');
    INSERT INTO mission_logs VALUES ('mission-log-1', 'user-1', 'mission-1', 'read_content', '2026-01-01', NULL, NULL, NULL, 'Leitura registrada', '2026-01-01');
    INSERT INTO gamification_config VALUES ('company-1', '["sono"]', '["sono"]', 1, 4, 12, '2026-01-01');
  `);
  return db;
}

function collectForbiddenKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((item) => collectForbiddenKeys(item, found));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKeys.has(key.toLowerCase())) found.push(key);
      collectForbiddenKeys(child, found);
    }
  }
  return found;
}

describe('safe authenticated projections', () => {
  it('projects users without legacy gamification fields at any nesting level', async () => {
    const modulePath = '@/lib/gamification/' + 'containment';
    const containment = await import(modulePath).catch(() => ({}));
    const project = (containment as { toSafeUserProjection?: (value: Record<string, unknown>) => unknown }).toSafeUserProjection;
    expect(project).toBeTypeOf('function');

    const projected = project?.({
      id: 'user-1', name: 'Ana', email: 'ana@example.test', role: 'colaboradora',
      company_id: 'company-1', points: 123, level: 8, league: 'gold', week_points: 50,
      badges: [{ id: 'badge-1', points: 10 }], streak: 4, pointsNextLevel: 80,
      achievementCount: 3, levelInfo: { level: 8 }, password_hash: 'secret',
      xpReward: 20, xpEarned: 30, userXpEarned: 40, pointsSpent: 50,
      xp_reward: 60, xp_earned: 70, user_xp_earned: 80, points_spent: 90,
    });
    expect(projected).toEqual({
      id: 'user-1', name: 'Ana', email: 'ana@example.test', role: 'colaboradora', company_id: 'company-1',
    });
  });

  it('removes points and level from the generic repository update allowlist', () => {
    const source = read('src/repositories/user.repository.ts');
    const allowlist = source.slice(source.indexOf('ALLOWED_USER_UPDATE_FIELDS'), source.indexOf('export async function updateUser'));
    expect(allowlist).not.toMatch(/\bpoints\b|\blevel\b/);
  });

  it('uses safe projections on every authenticated user boundary and filters legacy notifications', () => {
    const boundaries = [
      'src/services/auth.service.ts',
      'src/app/api/auth/login/route.ts',
      'src/app/api/auth/register/route.ts',
      'src/app/api/auth/me/route.ts',
      'src/app/api/users/me/route.ts',
      'src/app/api/company/route.ts',
      'src/app/api/leader/team/route.ts',
      'src/app/api/rh/users/route.ts',
      'src/app/api/admin/users/route.ts',
      'src/app/api/admin/companies/[id]/users/route.ts',
      'src/hooks/useAuth.ts',
    ];
    for (const boundary of boundaries) {
      expect(read(boundary), boundary).toContain('toSafeUserProjection');
    }
    expect(read('src/repositories/notification.repository.ts')).toContain('LEGACY_GAMIFICATION_NOTIFICATION_TYPES');
    expect(read('src/app/api/notifications/route.ts')).toContain('getCollaboratorNotifications');
    expect(read('src/services/collaborator.service.ts')).toContain('notifRepo.getUserNotifications');
    expect(read('src/app/api/notifications/count/route.ts')).toContain('countUnread');
  });

  it('executes every authenticated boundary and recursively excludes legacy canaries', async () => {
    useBoundaryDatabase();
    const password = 'Password1!';
    const contexts = {
      collaborator: { auth },
      leader: { auth: { ...auth, userId: 'leader-1', role: 'lideranca' } },
      rh: { auth: { ...auth, userId: 'rh-1', role: 'rh' } },
      admin: { auth: { ...auth, userId: 'admin-1', companyId: '', role: 'admin', isMasterAdmin: true } },
    };

    const responses: Array<[string, Response, number]> = [];
    responses.push(['register', await registerUser(new Request('http://localhost/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Nova Usuaria', email: 'nova@example.test', password, role: 'colaboradora', companyId: 'company-1' }),
    })), 201]);
    responses.push(['login', await loginUser(new Request('http://localhost/api/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'ana@example.test', password }),
    })), 200]);
    responses.push(['/api/auth/me', await getAuthMe(new Request('http://localhost/api/auth/me') as any, contexts.collaborator as any), 200]);
    responses.push(['/api/users/me', await getUserMe(new Request('http://localhost/api/users/me') as any, contexts.collaborator as any), 200]);
    responses.push(['/api/company', await getCompany(new Request('http://localhost/api/company') as any, contexts.rh as any), 200]);
    responses.push(['/api/leader/team', await getLeaderTeam(new Request('http://localhost/api/leader/team') as any, contexts.leader as any), 200]);
    responses.push(['/api/rh/users', await getRhUsers(new Request('http://localhost/api/rh/users') as any, contexts.rh as any), 200]);
    responses.push(['/api/admin/users', await getAdminUsers(new Request('http://localhost/api/admin/users') as any, contexts.admin as any), 200]);
    responses.push(['/api/admin/companies/:id/users', await getAdminCompanyUsers(
      new Request('http://localhost/api/admin/companies/company-1/users') as any,
      { ...contexts.admin, params: Promise.resolve({ id: 'company-1' }) } as any,
    ), 200]);
    responses.push(['/api/notifications', await getNotifications(new Request('http://localhost/api/notifications') as any, contexts.collaborator as any), 200]);
    responses.push(['/api/notifications/count', await getNotificationCount(new Request('http://localhost/api/notifications/count') as any, contexts.collaborator as any), 200]);

    const payloads = new Map<string, unknown>();
    for (const [name, response, status] of responses) {
      expect(response.status, name).toBe(status);
      const payload = await response.json();
      payloads.set(name, payload);
      expect(collectForbiddenKeys(payload), name).toEqual([]);
      expect(JSON.stringify(payload), name).not.toMatch(/CANARY_(?:BADGES|COMPANY_BADGES|LEGACY|BADGE|LEVEL|STREAK|GAME|REWARD)/);
    }

    expect(payloads.get('/api/notifications')).toEqual([{
      id: 'notification-1',
      type: 'campaign',
      title: 'Campanha',
      message: 'Conteudo seguro',
      timestamp: '2026-01-01',
      read: false,
    }]);
    expect(payloads.get('/api/notifications/count')).toEqual({ unread: 1 });
  });

  it('returns a collaborator home assembled only from explicitly safe source columns', async () => {
    useBoundaryDatabase();

    const response = await getCollaboratorHome(new Request('http://localhost/api/collaborator') as any, { auth } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      greeting: expect.any(String),
      userName: 'Ana',
      date: expect.any(String),
      examsPercent: 100,
      examsTotal: 1,
      contentViewed: 12,
      campaignsActive: 1,
      campaignsTotal: 4,
      unreadNotifications: 1,
    });
    expect(boundary.sql.join('\n')).not.toMatch(/SELECT\s+(?:u\.)?\*|\bpoints\b|\blevel\b|\bbadges?\b|\bchallenges?\b|\bstreak\b/i);
    const source = read('src/services/collaborator.service.ts');
    expect(source).not.toMatch(/badgeRepo|challengeRepo|getLevelFromPoints|healthAlert|actionsToday|streakDays|user\.points|user\.level|user\.streak/);
    expect(read('src/app/api/collaborator/route.ts')).not.toContain('toSafeUserProjection');
  });

  it('exposes only safe gamification configuration and quarantines ranking preference changes', () => {
    const config = read('src/app/api/gamification/config/route.ts');
    expect(config).toContain('SAFE_GAMIFICATION_CONFIG_FIELDS');
    expect(config).not.toMatch(/xp_per_action|streak_bonus|league_threshold|point_cost/);
    expect(read('src/app/api/users/me/preferences/route.ts')).toContain('privacy_ranking');
    expect(read('src/app/api/users/me/preferences/route.ts')).toContain('privacyReviewResponse');
  });

  it('returns exactly the five safe configuration fields from GET and PATCH', async () => {
    useBoundaryDatabase();
    const expected = {
      active_themes: ['sono'],
      theme_order: ['sono'],
      hearts_enabled: 1,
      hearts_per_day: 4,
      hearts_refill_hours: 12,
    };
    const getResponse = await configRoute.GET(new Request('http://localhost/api/gamification/config') as any, { auth } as any);
    expect(await getResponse.json()).toEqual(expected);

    const patchResponse = await configRoute.PATCH(new Request('http://localhost/api/gamification/config', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hearts_per_day: 6 }),
    }) as any, { auth: { ...auth, role: 'rh' } } as any);
    expect(await patchResponse.json()).toEqual({ ...expected, hearts_per_day: 6 });
  });

  it('falls back field-by-field when stored gamification configuration is malformed', async () => {
    const db = useBoundaryDatabase();
    db.prepare(`
      UPDATE gamification_config
      SET active_themes = ?, theme_order = ?, hearts_enabled = ?, hearts_per_day = ?, hearts_refill_hours = ?
      WHERE company_id = ?
    `).run('{broken', '{"not":"an-array"}', 7, -4, 999, 'company-1');
    const defaults = {
      active_themes: ['hidratacao', 'sono', 'prevencao', 'nutricao', 'mental', 'ciclo'],
      theme_order: ['hidratacao', 'sono', 'prevencao', 'nutricao', 'mental', 'ciclo'],
      hearts_enabled: 0,
      hearts_per_day: 5,
      hearts_refill_hours: 24,
    };

    const getResponse = await configRoute.GET(new Request('http://localhost/api/gamification/config') as any, { auth } as any);
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual(defaults);

    const patchResponse = await configRoute.PATCH(new Request('http://localhost/api/gamification/config', {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hearts_per_day: 9 }),
    }) as any, { auth: { ...auth, role: 'rh' } } as any);
    expect(patchResponse.status).toBe(200);
    expect(await patchResponse.json()).toEqual({ ...defaults, hearts_per_day: 9 });
  });

  it('labels preserved DSAR evidence as legacy derived data instead of current health or ranking', () => {
    const source = [
      read('src/app/api/users/me/export/route.ts'),
      read('src/lib/privacy/dsar-export.ts'),
    ].join('\n');
    expect(source).toContain('legacyDerivedData');
    expect(source).toContain('Derivado legado');
    expect(source).toMatch(/health_scores|healthScores/);
  });

  it('exports legacy-derived evidence using the real activity and mission log schemas', async () => {
    const db = useBoundaryDatabase();
    const response = await getDsarExport(new Request('http://localhost/api/users/me/export') as any, { auth } as any);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.legacyDerivedData).toMatchObject({
      label: 'Derivado legado — em revisão',
      userGamification: { points: 731, level: 8, league: 'ouro' },
      activityLog: [{ id: 'activity-1', action: 'legacy', target_type: 'lesson', target_id: 'lesson-1', points_earned: 50, created_at: '2026-01-01' }],
      missionLogs: [{ id: 'mission-log-1', mission_id: 'mission-1', action: 'read_content', day: '2026-01-01', mood: null, glasses: null, challenge_id: null, note: 'Leitura registrada', created_at: '2026-01-01' }],
    });
    expect(payload.notifications).toEqual([expect.objectContaining({
      id: 'notification-1', type: 'campaign', message: 'Conteudo seguro',
    })]);
    expect(payload.legacyDerivedData.notifications.map((item: { type: string }) => item.type).sort()).toEqual([
      'badge', 'gamification', 'level', 'reward', 'streak',
    ]);
    expect(JSON.stringify(payload.notifications)).not.toContain('CANARY_LEGACY');
    expect(payload.legacyDerivedData.label).toBe('Derivado legado — em revisão');
    expect(collectForbiddenKeys(payload.user)).toEqual([]);
    expect(boundary.dedicatedReadCloseCount).toBe(1);
    expect(db.prepare(`
      SELECT status FROM dsar_export_cooldowns WHERE user_id = 'user-1'
    `).get()).toEqual({ status: 'completed' });
  });

  it('exports every legacy history row beyond the former DSAR query caps', async () => {
    const db = useBoundaryDatabase();
    const historyAuth = {
      ...auth,
      userId: 'history-user',
      email: 'history@example.test',
    };
    db.prepare(`
      INSERT INTO users (id, company_id, department_id, name, nickname, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyAuth.userId,
      historyAuth.companyId,
      'department-1',
      'Historico Completo',
      'Historico',
      historyAuth.email,
      'hashed:Password1!',
      historyAuth.role,
    );

    const insertNotification = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, read, created_at, source, resource_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertActivity = db.prepare(`
      INSERT INTO activity_log (id, user_id, action, target_type, target_id, points_earned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMission = db.prepare(`
      INSERT INTO mission_logs (id, user_id, mission_id, action, day, mood, glasses, challenge_id, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (let index = 0; index < 201; index += 1) {
        const suffix = String(index).padStart(3, '0');
        insertNotification.run(
          index === 0 ? 'legacy-notification-oldest-canary' : `legacy-notification-${suffix}`,
          historyAuth.userId,
          'badge',
          'Legacy notification',
          index === 0 ? 'CANARY_OLDEST_LEGACY_NOTIFICATION' : `Legacy notification ${suffix}`,
          0,
          new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
          null,
          null,
        );
      }

      for (let index = 0; index < 501; index += 1) {
        const suffix = String(index).padStart(3, '0');
        const createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString();
        insertActivity.run(
          index === 0 ? 'legacy-activity-oldest-canary' : `legacy-activity-${suffix}`,
          historyAuth.userId,
          index === 0 ? 'CANARY_OLDEST_LEGACY_ACTIVITY' : 'legacy',
          'lesson',
          `lesson-${suffix}`,
          index,
          createdAt,
        );
        insertMission.run(
          index === 0 ? 'legacy-mission-oldest-canary' : `legacy-mission-${suffix}`,
          historyAuth.userId,
          `mission-${suffix}`,
          'read_content',
          createdAt,
          null,
          null,
          null,
          index === 0 ? 'CANARY_OLDEST_LEGACY_MISSION' : `Legacy mission ${suffix}`,
          createdAt,
        );
      }
    })();

    const response = await getDsarExport(
      new Request('http://localhost/api/users/me/export') as any,
      { auth: historyAuth } as any,
    );
    expect(response.status).toBe(200);
    expect(boundary.events.slice(-3)).toEqual(['initDb', 'getWriteQueue', 'openReadOnlyDb']);
    expect(boundary.dedicatedReadOpenCount).toBe(1);
    expect(boundary.dedicatedReadCloseCount).toBe(0);
    expect(db.prepare(`
      SELECT status FROM dsar_export_cooldowns WHERE user_id = ?
    `).get(historyAuth.userId)).toEqual({ status: 'in_progress' });

    const eventsBeforeSecondExport = boundary.events.length;
    const secondResponse = await getDsarExport(
      new Request('http://localhost/api/users/me/export') as any,
      { auth: historyAuth } as any,
    );
    expect(secondResponse.status).toBe(429);
    expect(await secondResponse.json()).toMatchObject({ status: 429, code: 'RATE_LIMIT' });
    expect(boundary.events.slice(eventsBeforeSecondExport)).toEqual(['initDb', 'getWriteQueue']);

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    if (!reader) return;
    const chunks: string[] = [];
    const decoder = new TextDecoder();
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      chunks.push(decoder.decode(result.value, { stream: true }));
    }
    chunks.push(decoder.decode());
    expect(chunks.length).toBeGreaterThan(1203);
    expect(boundary.dedicatedReadCloseCount).toBe(1);
    expect(db.prepare(`
      SELECT status FROM dsar_export_cooldowns WHERE user_id = ?
    `).get(historyAuth.userId)).toEqual({ status: 'completed' });

    const payload = JSON.parse(chunks.join(''));
    const legacy = payload.legacyDerivedData;

    expect({
      notificationCount: legacy.notifications.length,
      oldestNotification: legacy.notifications[legacy.notifications.length - 1],
      activityCount: legacy.activityLog.length,
      oldestActivity: legacy.activityLog[legacy.activityLog.length - 1],
      missionCount: legacy.missionLogs.length,
      oldestMission: legacy.missionLogs[legacy.missionLogs.length - 1],
    }).toMatchObject({
      notificationCount: 201,
      oldestNotification: {
        id: 'legacy-notification-oldest-canary',
        message: 'CANARY_OLDEST_LEGACY_NOTIFICATION',
      },
      activityCount: 501,
      oldestActivity: {
        id: 'legacy-activity-oldest-canary',
        action: 'CANARY_OLDEST_LEGACY_ACTIVITY',
      },
      missionCount: 501,
      oldestMission: {
        id: 'legacy-mission-oldest-canary',
        note: 'CANARY_OLDEST_LEGACY_MISSION',
      },
    });
  });

  it('closes the dedicated reader on cancellation without releasing the cooldown', async () => {
    const db = useBoundaryDatabase();
    const response = await getDsarExport(
      new Request('http://localhost/api/users/me/export') as any,
      { auth } as any,
    );
    expect(response.status).toBe(200);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    if (!reader) return;

    expect((await reader.read()).done).toBe(false);
    await reader.cancel();
    expect(boundary.dedicatedReadCloseCount).toBe(1);
    expect(() => db.prepare('SELECT 1').get()).not.toThrow();
    expect(db.prepare(`
      SELECT status, next_allowed_at FROM dsar_export_cooldowns WHERE user_id = 'user-1'
    `).get()).toMatchObject({ status: 'cancelled', next_allowed_at: expect.any(Number) });

    const openCount = boundary.dedicatedReadOpenCount;
    const retry = await getDsarExport(
      new Request('http://localhost/api/users/me/export') as any,
      { auth } as any,
    );
    expect(retry.status).toBe(429);
    expect(boundary.dedicatedReadOpenCount).toBe(openCount);
  });

  it('marks a lazy stream failure as retryable and closes the dedicated reader', async () => {
    const db = useBoundaryDatabase();
    boundary.failDedicatedReadAfterPrepareCount = 1;
    const response = await getDsarExport(
      new Request('http://localhost/api/users/me/export') as any,
      { auth } as any,
    );
    expect(response.status).toBe(200);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    if (!reader) return;

    try {
      expect((await reader.read()).done).toBe(false);
      await expect(reader.read()).rejects.toThrow('dedicated read failure');
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    expect(boundary.dedicatedReadCloseCount).toBe(1);
    expect(db.prepare(`
      SELECT status, next_allowed_at FROM dsar_export_cooldowns WHERE user_id = 'user-1'
    `).get()).toEqual({ status: 'failed', next_allowed_at: 0 });

    boundary.failDedicatedReadAfterPrepareCount = null;
    boundary.dedicatedPrepareCount = 0;
    const retry = await getDsarExport(
      new Request('http://localhost/api/users/me/export') as any,
      { auth } as any,
    );
    expect(retry.status).toBe(200);
    expect(boundary.dedicatedReadOpenCount).toBe(2);
    await retry.body?.cancel();
  });

  it('streams DSAR collections with pull and row iterators instead of aggregate serialization', () => {
    const routeSource = read('src/app/api/users/me/export/route.ts');
    const helperPath = path.join(root, 'src/lib/privacy/dsar-export.ts');
    const helperSource = fs.existsSync(helperPath) ? fs.readFileSync(helperPath, 'utf8') : '';
    const source = `${routeSource}\n${helperSource}`;

    expect(routeSource).toContain('new ReadableStream');
    expect(routeSource).toMatch(/pull\s*\(controller\)/);
    expect(routeSource).not.toMatch(/start\s*\(controller\)/);
    expect(routeSource).toMatch(/cancel\s*\(\)/);
    expect(routeSource).toContain('iterator.return');
    expect(routeSource).toContain('openReadOnlyDb');
    expect(routeSource).not.toContain('getReadDb');
    expect(routeSource).toContain("addEventListener('abort'");
    expect(routeSource).toContain("removeEventListener('abort'");
    expect(source).toContain('.iterate(');
    expect(source).not.toContain('.all(');
    expect(source).not.toMatch(/\bexportData\b|JSON\.stringify\(\s*exportData/);
    expect(source).toMatch(/type\s+NOT\s+IN\s*\(/i);
    expect(source).toMatch(/type\s+IN\s*\(/i);
    expect(routeSource).toContain("'Cache-Control': 'private, no-store'");
    expect(routeSource).toContain("'Vary': 'Cookie'");
  });

  it('keeps reachable collaborator role descriptions free of gamified reward promises', () => {
    const adminSource = read('src/app/(platform)/admin/page.tsx');
    const invitesSource = read('src/app/(platform)/convites/page.tsx');
    const adminTitleExpression = adminSource.match(/title=\{editForm\.role === 'rh'[\s\S]*?\}>/)?.[0] ?? '';
    const inviteRoleOptions = invitesSource.match(/const ROLE_OPTIONS = \[[\s\S]*?\n\];/)?.[0] ?? '';

    expect(adminTitleExpression).not.toBe('');
    expect(inviteRoleOptions).not.toBe('');
    for (const [surface, roleDescriptions] of [
      ['src/app/(platform)/admin/page.tsx', adminTitleExpression],
      ['src/app/(platform)/convites/page.tsx', inviteRoleOptions],
    ] as const) {
      expect(roleDescriptions, surface).not.toMatch(/\b(?:pontos?|xp|ranking)\b/i);
      expect(roleDescriptions, surface).toContain('Usuária padrão — acessa conteúdos e recursos de bem-estar');
    }
  });

  it('removes numeric gamification promises and totals from platform source', () => {
    const neutralDeepLinks = [
      'src/app/(platform)/desafios/gerenciar/page.tsx',
      'src/app/(platform)/gamificacao-config/page.tsx',
      'src/app/(platform)/liga/page.tsx',
      'src/app/(platform)/liga/gerenciar/page.tsx',
    ];
    for (const page of neutralDeepLinks) {
      const source = read(page);
      expect(source, page).toContain('FeedbackState');
      expect(source, page).toContain('LEGACY_GAMIFICATION_STATE.message');
    }

    const approvedParticipationPages = [
      'src/app/(platform)/conquistas/page.tsx',
      'src/app/(platform)/desafios/page.tsx',
      'src/app/(platform)/objetivos/page.tsx',
    ].map(read).join('\n');
    expect(approvedParticipationPages).not.toMatch(/week_points|points_spent|xp_reward|pontos totais|subir de nível|ranking semanal|exibir no ranking/i);
    expect(approvedParticipationPages).not.toMatch(/user_badges|user_leagues|custom_league_members|health_scores/);

    const reachablePages = [
      'src/app/(platform)/colaboradora/page.tsx',
      'src/app/(platform)/colaboradoras-gestao/page.tsx',
      'src/app/(platform)/company-profile/page.tsx',
      'src/app/(platform)/primeiro-acesso/page.tsx',
      'src/app/(platform)/notificacoes/page.tsx',
      'src/app/(platform)/configuracoes/page.tsx',
    ].map(read).join('\n');
    expect(reachablePages).not.toMatch(/week_points|points_spent|xp_reward|pontos totais|subir de nível|ranking semanal|exibir no ranking/i);
    const collaboratorHome = read('src/app/(platform)/colaboradora/page.tsx');
    expect(collaboratorHome).not.toMatch(/streakDays|achievementCount|Sequência atual|Conquistas/);
    const adminSource = read('src/app/(platform)/admin/page.tsx');
    expect(adminSource).not.toContain("activeTab === 'Badges'");
    expect(adminSource).not.toMatch(/<span>Nível \{u\.level\}|u\.points\.toLocaleString/);
  });
});
