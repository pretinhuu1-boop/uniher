import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ db: null as Database.Database | null }));

vi.mock('@/lib/auth/middleware', () => {
  const expose = (handler: (...args: any[]) => unknown) => handler;
  return { withAuth: expose, withRole: () => expose, withMasterAdmin: expose };
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

import { POST as checkIn } from '@/app/api/gamification/check-in/route';
import { GET as getLesson, POST as completeLesson } from '@/app/api/gamification/daily-lesson/route';
import { POST as completeMission } from '@/app/api/gamification/daily-missions/[id]/complete/route';
import { POST as joinCampaign } from '@/app/api/campaigns/join/route';
import { LEGACY_GAMIFICATION_STATE } from '@/lib/gamification/containment';
import * as objectivesService from '@/services/objectives.service';
import * as leagueService from '@/services/league.service';
import * as activityLogRepository from '@/repositories/activity-log.repository';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

afterEach(() => {
  runtime.db?.close();
  runtime.db = null;
});

function useWriteDatabase() {
  const db = new Database(':memory:');
  runtime.db = db;
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, points INTEGER, level INTEGER, streak INTEGER, last_active TEXT, updated_at TEXT);
    CREATE TABLE user_leagues (id TEXT PRIMARY KEY, user_id TEXT, league TEXT, week_points INTEGER, week_start TEXT);
    CREATE TABLE custom_league_members (id TEXT PRIMARY KEY, league_id TEXT, user_id TEXT, week_points INTEGER);
    CREATE TABLE user_badges (user_id TEXT, badge_id TEXT, unlocked_at TEXT);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT, dimension TEXT, score REAL, status TEXT, recorded_at TEXT);
    CREATE TABLE daily_missions (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, xp INTEGER, category TEXT, action TEXT, day TEXT, completed INTEGER DEFAULT 0, completed_at TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE mission_logs (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, action TEXT, day TEXT, mood TEXT, glasses INTEGER, challenge_id TEXT, note TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE daily_lessons (
      id TEXT PRIMARY KEY, company_id TEXT, title TEXT NOT NULL, description TEXT, type TEXT NOT NULL,
      theme TEXT NOT NULL, content_json TEXT, xp_reward INTEGER, duration_seconds INTEGER,
      week_number INTEGER, day_of_week INTEGER, order_index INTEGER, active INTEGER
    );
    CREATE TABLE user_lesson_progress (id TEXT PRIMARY KEY, user_id TEXT, lesson_id TEXT, completed INTEGER, score INTEGER, xp_earned INTEGER, completed_at TEXT, UNIQUE(user_id, lesson_id));
    CREATE TABLE gamification_config (company_id TEXT PRIMARY KEY, hearts_enabled INTEGER, hearts_refill_hours INTEGER);
    CREATE TABLE user_hearts (user_id TEXT PRIMARY KEY, hearts INTEGER, max_hearts INTEGER);
    CREATE TABLE user_campaigns (user_id TEXT, campaign_id TEXT, progress INTEGER, PRIMARY KEY(user_id, campaign_id));
    INSERT INTO users VALUES ('user-1', 731, 8, 4, NULL, '2026-01-01');
    INSERT INTO user_leagues VALUES ('league-1', 'user-1', 'ouro', 99, '2026-01-01');
    INSERT INTO custom_league_members VALUES ('custom-1', 'custom-league-1', 'user-1', 88);
    INSERT INTO user_badges VALUES ('user-1', 'badge-1', '2026-01-01');
    INSERT INTO health_scores VALUES ('health-1', 'user-1', 'Sono', 77, 'yellow', '2026-01-01');
    INSERT INTO daily_lessons VALUES (
      'lesson-1', 'company-1', 'Cuidado diario', 'Conteudo privado', 'pilula', 'geral',
      '{"text":"Cuide-se hoje"}', 20, 30, 1, 1, 0, 1
    );
    INSERT INTO daily_lessons VALUES (
      'lesson-foreign', 'company-2', 'FOREIGN_LESSON_CANARY', 'Nao pode aparecer', 'pilula', 'geral',
      '{"text":"FOREIGN_CONTENT_CANARY"}', 999, 30, 1, 1, 0, 1
    );
    INSERT INTO user_lesson_progress VALUES ('progress-other', 'user-2', 'lesson-1', 0, 17, 7, NULL);
    INSERT INTO user_lesson_progress VALUES ('progress-foreign', 'user-2', 'lesson-foreign', 1, 99, 999, '2026-01-01');
    INSERT INTO gamification_config VALUES ('company-1', 0, 24);
  `);
  return db;
}

function legacySnapshot(db: Database.Database) {
  return {
    user: db.prepare('SELECT points, level FROM users WHERE id = ?').get('user-1'),
    leagues: db.prepare('SELECT * FROM user_leagues ORDER BY id').all(),
    customLeagues: db.prepare('SELECT * FROM custom_league_members ORDER BY id').all(),
    badges: db.prepare('SELECT * FROM user_badges ORDER BY badge_id').all(),
    healthScores: db.prepare('SELECT * FROM health_scores ORDER BY id').all(),
  };
}

function legacySnapshotBytes(db: Database.Database) {
  return JSON.stringify(legacySnapshot(db));
}

function findForbiddenResponseKeys(value: unknown, path = '$'): string[] {
  const forbidden = new Set([
    'point', 'points', 'level', 'xp', 'xpreward', 'xpearned', 'userxpearned', 'league',
    'rank', 'ranking', 'badge', 'badges', 'weekpoints', 'pointsspent', 'currentxp', 'nextlevelxp',
    'streak', 'currentstreak', 'longeststreak', 'streakcount', 'streakdays',
    'reward', 'rewards', 'pointcost', 'pointscost', 'rewardpoint', 'rewardpoints',
    'healthscore', 'healthscores', 'dimension',
  ]);
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenResponseKeys(item, `${path}[${index}]`));
  }
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    const own = forbidden.has(normalizedKey) || normalizedKey.startsWith('dailyxp')
      ? [`${path}.${key}`]
      : [];
    return [...own, ...findForbiddenResponseKeys(child, `${path}.${key}`)];
  });
}

function expectPointFreeBoundary(payload: unknown) {
  expect(findForbiddenResponseKeys(payload)).toEqual([]);
}

function productionSources(directory = path.join(root, 'src')): string {
  return fs.readdirSync(directory, { withFileTypes: true }).map((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return productionSources(fullPath);
    if (!/\.(?:ts|tsx)$/.test(entry.name)) return '';
    if (fullPath.endsWith('objectives.service.ts') || fullPath.endsWith('league.service.ts') || fullPath.endsWith('activity-log.repository.ts')) return '';
    return fs.readFileSync(fullPath, 'utf8');
  }).join('\n');
}

describe('legacy gamification write containment', () => {
  it('projects lesson payloads immutably while preserving educational and neutral state fields', async () => {
    const containment = await import('@/lib/gamification/containment') as Record<string, unknown>;
    const project = containment.toSafeLessonProjection as ((value: unknown) => unknown) | undefined;
    const cycle: Record<string, unknown> = {
      label: 'conteudo seguro',
      points_spent: 31,
    };
    cycle.self = cycle;
    const source = {
      score: 92,
      hearts: { current: 3, max: 5 },
      heartsEnabled: true,
      gamification: LEGACY_GAMIFICATION_STATE,
      content: {
        key_points: ['Sono regular ajuda a saude.'],
        note: 'pontos de atencao para conversar com a equipe',
        cycle,
        legacy: {
          week_points: 40,
          points_spent: 12,
          current_xp: 18,
          next_level_xp: 90,
          daily_xp_goal: 10,
          daily_xp_bonus: 3,
          streak: 7,
          reward: 'badge',
          rewards: ['cupom'],
          points_cost: 20,
          reward_points: 50,
        },
      },
    };

    expect(project).toBeTypeOf('function');
    const projected = project?.(source) as typeof source;

    expect(projected).not.toBe(source);
    expect(projected.content).not.toBe(source.content);
    expect(projected).toMatchObject({
      score: 92,
      hearts: { current: 3, max: 5 },
      heartsEnabled: true,
      gamification: LEGACY_GAMIFICATION_STATE,
      content: {
        key_points: ['Sono regular ajuda a saude.'],
        note: 'pontos de atencao para conversar com a equipe',
        cycle: { label: 'conteudo seguro' },
        legacy: {},
      },
    });
    expect(source.content.legacy.points_spent).toBe(12);
    expect(source.content.cycle.self).toBe(cycle);
  });

  it('omits excessively deep lesson subtrees without throwing or overflowing the stack', async () => {
    const containment = await import('@/lib/gamification/containment') as Record<string, unknown>;
    const project = containment.toSafeLessonProjection as ((value: unknown) => unknown) | undefined;
    const source: Record<string, unknown> = { title: 'Conteudo educativo' };
    let cursor = source;
    for (let depth = 0; depth < 5_000; depth += 1) {
      const next: Record<string, unknown> = {};
      cursor.next = next;
      cursor = next;
    }
    cursor.deep_marker = 'TOO_DEEP_CANARY';
    cursor.daily_xp_earned = 999;

    expect(project).toBeTypeOf('function');
    expect(() => project?.(source)).not.toThrow();
    const projected = project?.(source);
    expect(JSON.stringify(projected)).not.toContain('TOO_DEEP_CANARY');
  });

  it('exports one immutable quarantine state and only the point-free read_content action', async () => {
    const modulePath = '@/lib/gamification/' + 'containment';
    const containment = await import(modulePath).catch(() => ({}));
    const state = (containment as { LEGACY_GAMIFICATION_STATE?: unknown }).LEGACY_GAMIFICATION_STATE;
    const actions = (containment as { SAFE_MISSION_ACTIONS?: Set<string> }).SAFE_MISSION_ACTIONS;

    expect(state).toEqual({
      status: 'under_review',
      reason: 'eligible_ledger_required',
      message: 'Pontuação e classificação estão em revisão.',
    });
    expect(Object.isFrozen(state)).toBe(true);
    expect(actions).toBeInstanceOf(Set);
    expect([...actions ?? []]).toEqual(['read_content']);
    expect(() => actions?.add('check_in')).toThrow(/immutable|read.?only|unavailable/i);
    expect(() => actions?.delete('read_content')).toThrow(/immutable|read.?only|unavailable/i);
    expect(() => actions?.clear()).toThrow(/immutable|read.?only|unavailable/i);
    expect(() => Set.prototype.add.call(actions, 'prototype_bypass')).toThrow();
    let callbackFacade: Set<string> | undefined;
    actions?.forEach((_value, _key, facade) => { callbackFacade = facade as Set<string>; });
    expect(callbackFacade).toBe(actions);
    expect(() => callbackFacade?.add('callback_bypass')).toThrow(/immutable|read.?only|unavailable/i);
    expect(() => callbackFacade?.delete('read_content')).toThrow(/immutable|read.?only|unavailable/i);
    expect(() => callbackFacade?.clear()).toThrow(/immutable|read.?only|unavailable/i);
    expect(() => Set.prototype.add.call(callbackFacade, 'callback_prototype_bypass')).toThrow();
    expect([...actions ?? []]).toEqual(['read_content']);
    expect(actions?.has('check_in')).toBe(false);
  });

  it('executes allowed boundaries without changing any quarantined legacy table', async () => {
    const db = useWriteDatabase();
    const before = legacySnapshotBytes(db);
    const auth = { userId: 'user-1', companyId: 'company-1', role: 'colaboradora', email: 'ana@example.test' };

    const checkInResponse = await checkIn(new Request('http://localhost/api/gamification/check-in', { method: 'POST' }) as any, { auth } as any);
    expect(checkInResponse.status).toBe(200);
    expectPointFreeBoundary(await checkInResponse.json());

    const lessonResponse = await completeLesson(new Request('http://localhost/api/gamification/daily-lesson', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonId: 'lesson-1', score: 90 }),
    }) as any, { auth } as any);
    expect(lessonResponse.status).toBe(200);
    const lessonPayload = await lessonResponse.json();
    expect(lessonPayload).toEqual({
      success: true,
      progressRecorded: true,
      gamification: LEGACY_GAMIFICATION_STATE,
      score: 90,
    });
    expectPointFreeBoundary(lessonPayload);
    expect(db.prepare(
      'SELECT user_id, lesson_id, completed, score, xp_earned FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?'
    ).get('user-1', 'lesson-1')).toEqual({
      user_id: 'user-1', lesson_id: 'lesson-1', completed: 1, score: 90, xp_earned: 0,
    });
    expect(db.prepare(
      'SELECT id, user_id, lesson_id, completed, score, xp_earned, completed_at FROM user_lesson_progress WHERE user_id = ?'
    ).get('user-2')).toEqual({
      id: 'progress-other', user_id: 'user-2', lesson_id: 'lesson-1', completed: 0, score: 17, xp_earned: 7, completed_at: null,
    });
    expect(db.prepare('SELECT COUNT(*) AS total FROM user_lesson_progress').get()).toEqual({ total: 3 });

    const mission = db.prepare("SELECT id FROM daily_missions WHERE user_id = ? AND action = 'read_content'").get('user-1') as { id: string };
    const missionResponse = await completeMission(new Request(`http://localhost/api/gamification/daily-missions/${mission.id}/complete`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ note: 'Li o conteudo educativo completo hoje.' }),
    }) as any, { auth, params: Promise.resolve({ id: mission.id }) } as any);
    expect(missionResponse.status).toBe(200);
    expect(await missionResponse.json()).toMatchObject({ success: true, progressRecorded: true });

    const campaignResponse = await joinCampaign(new Request('http://localhost/api/campaigns/join', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ campaignId: 'campaign-1' }),
    }) as any, { auth } as any);
    expect(campaignResponse.status).toBe(200);
    expect(await campaignResponse.json()).toMatchObject({ success: true, progressRecorded: true });

    expect(legacySnapshotBytes(db)).toBe(before);
    expect(db.prepare('SELECT * FROM user_campaigns WHERE user_id = ?').all('user-1')).toHaveLength(1);
    expect(db.prepare("SELECT action, note FROM mission_logs WHERE user_id = ?").get('user-1')).toEqual({
      action: 'read_content', note: 'Li o conteudo educativo completo hoje.',
    });
  });

  it('updates only the authenticated user lesson row with pedagogical score and zero XP', async () => {
    const db = useWriteDatabase();
    db.prepare(
      'INSERT INTO user_lesson_progress VALUES (?, ?, ?, 0, 11, 23, NULL)'
    ).run('progress-self', 'user-1', 'lesson-1');
    const before = legacySnapshotBytes(db);
    const auth = { userId: 'user-1', companyId: 'company-1', role: 'colaboradora', email: 'ana@example.test' };

    const response = await completeLesson(new Request('http://localhost/api/gamification/daily-lesson', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lessonId: 'lesson-1', score: 64 }),
    }) as any, { auth } as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      progressRecorded: true,
      gamification: LEGACY_GAMIFICATION_STATE,
      score: 64,
    });
    expectPointFreeBoundary(payload);
    expect(db.prepare(
      'SELECT id, user_id, lesson_id, completed, score, xp_earned FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?'
    ).get('user-1', 'lesson-1')).toEqual({
      id: 'progress-self', user_id: 'user-1', lesson_id: 'lesson-1', completed: 1, score: 64, xp_earned: 0,
    });
    expect(db.prepare(
      'SELECT id, user_id, lesson_id, completed, score, xp_earned, completed_at FROM user_lesson_progress WHERE user_id = ?'
    ).get('user-2')).toEqual({
      id: 'progress-other', user_id: 'user-2', lesson_id: 'lesson-1', completed: 0, score: 17, xp_earned: 7, completed_at: null,
    });
    expect(db.prepare('SELECT COUNT(*) AS total FROM user_lesson_progress').get()).toEqual({ total: 3 });
    expect(legacySnapshotBytes(db)).toBe(before);
  });

  it('returns private lesson progress with hearts and neutral quarantine state but no legacy fields or foreign canary', async () => {
    const db = useWriteDatabase();
    db.prepare('UPDATE gamification_config SET hearts_enabled = 1 WHERE company_id = ?').run('company-1');
    db.prepare('INSERT INTO user_hearts VALUES (?, ?, ?)').run('user-1', 3, 5);
    db.prepare('INSERT INTO user_lesson_progress VALUES (?, ?, ?, 0, 88, 404, NULL)').run('progress-self', 'user-1', 'lesson-1');
    const sourceContent = JSON.stringify({
      text: 'Cuide-se hoje',
      score: 88,
      key_points: ['Observe sinais do seu corpo.'],
      note: 'pontos de atencao continuam sendo conteudo educativo',
      nestedLegacy: {
        points: 731,
        points_spent: 12,
        level: 8,
        xp: 90,
        current_xp: 90,
        next_level_xp: 120,
        daily_xp_goal: 30,
        daily_xp_earned: 10,
        daily_xp_bonus: 4,
        league: 'ouro',
        rank: 1,
        badges: ['badge-1'],
        week_points: 99,
        streak: 7,
        reward: 'cupom',
        rewards: ['badge'],
        points_cost: 25,
        reward_points: 50,
        health_scores: [{ dimension: 'Sono', health_score: 77 }],
      },
    });
    db.prepare('UPDATE daily_lessons SET content_json = ? WHERE id = ?').run(sourceContent, 'lesson-1');
    const auth = { userId: 'user-1', companyId: 'company-1', role: 'colaboradora', email: 'ana@example.test' };

    const response = await getLesson(new Request('http://localhost/api/gamification/daily-lesson') as any, { auth } as any);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.hearts).toEqual({ current: 3, max: 5 });
    expect(payload.heartsEnabled).toBe(true);
    expect(payload.gamification).toEqual(LEGACY_GAMIFICATION_STATE);
    expect(payload.lesson.user_score).toBe(88);
    expect(payload.lesson.content_json).toMatchObject({
      text: 'Cuide-se hoje',
      score: 88,
      key_points: ['Observe sinais do seu corpo.'],
      note: 'pontos de atencao continuam sendo conteudo educativo',
      nestedLegacy: {},
    });
    expect(payload.path[0].content_json).toEqual(payload.lesson.content_json);
    expect(findForbiddenResponseKeys(payload)).toEqual([]);
    expect(db.prepare('SELECT content_json FROM daily_lessons WHERE id = ?').get('lesson-1')).toEqual({
      content_json: sourceContent,
    });
    expect(JSON.stringify(payload)).not.toContain('FOREIGN_LESSON_CANARY');
    expect(JSON.stringify(payload)).not.toContain('FOREIGN_CONTENT_CANARY');
  });

  it('fail-closes residual legacy services before any database access', async () => {
    const unavailable = /Legacy gamification is unavailable/;
    await expect(objectivesService.updateObjectivesProgress('user-1', 'company-1', 'points')).rejects.toThrow(unavailable);
    await expect(objectivesService.createObjective({} as never)).rejects.toThrow(unavailable);
    expect(() => objectivesService.claimObjectiveReward('user-1', 'company-1', 'objective-1')).toThrow(unavailable);
    expect(() => leagueService.getLeagueRanking('bronze')).toThrow(unavailable);
    expect(() => leagueService.getUserLeagueStatus('user-1')).toThrow(unavailable);
    await expect(leagueService.processLeagueTransitions('2026-01-01')).rejects.toThrow(unavailable);
    expect(() => leagueService.ensureUserInLeague('user-1', 'bronze')).toThrow(unavailable);
    await expect(activityLogRepository.createActivity({ userId: 'user-1', action: 'legacy' })).rejects.toThrow(unavailable);
    expect(() => activityLogRepository.getUserActivities('user-1')).toThrow(unavailable);
    expect(() => activityLogRepository.getLatestActivityDate('user-1')).toThrow(unavailable);
    expect(() => activityLogRepository.countDailyActivities('user-1')).toThrow(unavailable);

    expect(productionSources()).not.toMatch(/services\/(?:objectives|league)\.service|repositories\/activity-log\.repository/);
  });

  it('rejects client activity writes and keeps every legacy completion endpoint unavailable', () => {
    const unavailableRoutes: Array<[string, 'POST' | 'PATCH']> = [
      ['src/app/api/collaborator/activities/route.ts', 'POST'],
      ['src/app/api/gamification/rewards/redeem/route.ts', 'POST'],
      ['src/app/api/objectives/[id]/claim/route.ts', 'POST'],
      ['src/app/api/collaborator/challenges/route.ts', 'POST'],
      ['src/app/api/collaborator/challenges/[id]/route.ts', 'PATCH'],
    ];

    for (const [route, method] of unavailableRoutes) {
      const source = read(route);
      const handlerStart = source.indexOf(`export const ${method}`);
      const guardedSource = source.slice(handlerStart);
      const privacyCall = guardedSource.indexOf('privacyReviewResponse()');
      const databaseCall = guardedSource.search(/getReadDb\(\)|getWriteQueue\(\)|await initDb\(/);
      expect(privacyCall, route).toBeGreaterThanOrEqual(0);
      expect(databaseCall === -1 || privacyCall < databaseCall, route).toBe(true);
    }
  });

  it('keeps only private point-free presence and educational/campaign progress', () => {
    const pointFreeRoutes = [
      'src/app/api/gamification/check-in/route.ts',
      'src/app/api/gamification/daily-lesson/route.ts',
      'src/app/api/gamification/daily-missions/[id]/complete/route.ts',
      'src/app/api/campaigns/join/route.ts',
    ];
    const forbidden = /addPoints|awardBadge|week_points|user_leagues|custom_league_members|user_badges|health_scores|recalculateSemaforo|pointsEarned|levelUp/;

    for (const route of pointFreeRoutes) {
      const source = read(route);
      expect(source, route).not.toMatch(forbidden);
    }
    expect(read('src/app/api/gamification/daily-missions/route.ts')).toContain('SAFE_MISSION_ACTIONS');
    expect(read('src/app/api/gamification/daily-missions/[id]/complete/route.ts')).toContain('progressRecorded: true');
    expect(read('src/app/api/campaigns/join/route.ts')).toContain('progressRecorded: true');
  });

  it('allows educational lesson content but removes XP from RH writes and UI promises', () => {
    const createSource = read('src/app/api/rh/lessons/route.ts');
    const updateSource = read('src/app/api/rh/lessons/[id]/route.ts');
    const createSchema = createSource.slice(createSource.indexOf('const createLessonSchema'), createSource.indexOf('// POST /api/rh/lessons'));
    const updateSchema = updateSource.slice(updateSource.indexOf('const patchLessonSchema'), updateSource.indexOf('function parseLessonRow'));
    expect(createSchema).not.toContain('xp_reward');
    expect(updateSchema).not.toContain('xp_reward');
    expect(createSource).toContain("hasOwnProperty.call(body, 'xp_reward')");
    expect(updateSource).toContain("hasOwnProperty.call(body, 'xp_reward')");
    expect(read('src/components/gamification/DailyLesson.tsx')).not.toMatch(/XP ganho|ganhe XP|\+\s*\d+\s*XP|xp_reward/i);
  });
});
