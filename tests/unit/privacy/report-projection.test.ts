import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let database: Database.Database;
const executedSql: string[] = [];

vi.mock('@/lib/db', () => ({
  getReadDb: () => database,
}));

import {
  SAFE_COMMUNICATION_ACTIONS,
  dashboardQuerySchema,
  getProtectedCommunicationsProjection,
  getProtectedDashboardProjection,
  communicationsQuerySchema,
} from '@/services/dashboard.service';
import { createDashboardViewModel } from '@/app/(platform)/dashboard/dashboard-view-model';
import { buildDashboardCsv } from '@/app/(platform)/dashboard/dashboard-export';

const NOW = '2026-07-16T12:00:00.000Z';

function createDatabase() {
  database = new Database(':memory:', {
    verbose: (sql) => executedSql.push(String(sql)),
  });
  database.exec(`
    CREATE TABLE departments (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#536444'
    );
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      department_id TEXT,
      role TEXT NOT NULL,
      also_collaborator INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      blocked INTEGER DEFAULT 0,
      approved INTEGER NOT NULL DEFAULT 1,
      birth_date TEXT,
      points INTEGER NOT NULL DEFAULT 86421,
      streak INTEGER NOT NULL DEFAULT 86421
    );
    CREATE TABLE user_exams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exam_name TEXT NOT NULL DEFAULT 'Exame',
      completed_date TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
    CREATE TABLE notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      source TEXT
    );
  `);
  database.prepare('INSERT INTO departments (id, company_id, name, color) VALUES (?, ?, ?, ?)')
    .run('dept-a', 'company-a', 'Opera\u00e7\u00f5es', '#536444');
  database.prepare('INSERT INTO departments (id, company_id, name, color) VALUES (?, ?, ?, ?)')
    .run('dept-b', 'company-a', 'Produto', '#b98643');
  database.prepare('INSERT INTO departments (id, company_id, name, color) VALUES (?, ?, ?, ?)')
    .run('foreign-dept', 'company-b', 'Outra empresa', '#000000');
}

function addUser(
  id: string,
  departmentId: string | null = 'dept-a',
  overrides: Partial<{
    companyId: string;
    role: string;
    alsoCollaborator: number;
    deletedAt: string | null;
    blocked: number | null;
    approved: number;
    birthDate: string;
  }> = {},
) {
  database.prepare(`
    INSERT INTO users (
      id, company_id, department_id, role, also_collaborator,
      deleted_at, blocked, approved, birth_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    overrides.companyId ?? 'company-a',
    departmentId,
    overrides.role ?? 'colaboradora',
    overrides.alsoCollaborator ?? 0,
    overrides.deletedAt ?? null,
    Object.prototype.hasOwnProperty.call(overrides, 'blocked') ? overrides.blocked : 0,
    overrides.approved ?? 1,
    overrides.birthDate ?? '1996-01-01',
  );
}

function addExam(
  id: string,
  userId: string,
  eventAt = '2026-07-10T12:00:00.000Z',
  overrides: { status?: string; completedDate?: string | null; createdAt?: string } = {},
) {
  const status = overrides.status ?? 'completed';
  const completedDate = Object.prototype.hasOwnProperty.call(overrides, 'completedDate')
    ? overrides.completedDate
    : eventAt.slice(0, 10);
  database.prepare(`
    INSERT INTO user_exams (id, user_id, completed_date, status, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, userId, completedDate, status, overrides.createdAt ?? eventAt);
}

function addNotification(
  id: string,
  userId: string,
  type: string,
  createdAt: string,
  source: string | null = null,
) {
  database.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, created_at, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, type, 'CANARY 86421', 'CANARY 86421', createdAt, source);
}

function addEligibleExamContributors(count: number, departmentId = 'dept-a') {
  for (let index = 1; index <= count; index += 1) {
    const id = `${departmentId}-person-${index}`;
    addUser(id, departmentId);
    addExam(`${id}-exam-a`, id);
    addExam(`${id}-exam-b`, id);
  }
}

beforeEach(() => {
  executedSql.length = 0;
  createDatabase();
});

afterEach(() => {
  database.close();
});

describe('protected report projection', () => {
  it('suppresses 9 exact distinct contributors and exposes 10 without leaking canaries or internals', () => {
    addEligibleExamContributors(9);

    const nine = getProtectedDashboardProjection({
      companyId: 'company-a',
      period: '1m',
      now: NOW,
    });
    expect(nine.metrics.examActivity.status).toBe('suppressed');
    expect(JSON.stringify(nine)).not.toMatch(/86421|rawValue|contributorCount|numerator|denominator/);

    const csv = buildDashboardCsv(createDashboardViewModel(nine));
    expect(csv).toContain('Dados insuficientes para proteger a privacidade');
    expect(csv).not.toContain('86421');

    addUser('person-10');
    addExam('person-10-exam', 'person-10');
    const ten = getProtectedDashboardProjection({
      companyId: 'company-a',
      period: '1m',
      now: NOW,
    });
    expect(ten.metrics.examActivity).toEqual({ status: 'visible', value: 10 });
  });

  it('counts only exact eligible tenant contributors and persisted collaborator capability', () => {
    addEligibleExamContributors(8);
    addUser('eligible-rh', 'dept-a', { role: 'rh', alsoCollaborator: 1 });
    addExam('rh-exam', 'eligible-rh');
    addUser('eligible-admin', 'dept-a', { role: 'admin', alsoCollaborator: 1 });
    addExam('admin-exam', 'eligible-admin');

    const ineligible = [
      ['plain-leader', { role: 'lideranca' }],
      ['deleted', { deletedAt: '2026-07-01' }],
      ['blocked', { blocked: 1 }],
      ['blocked-null', { blocked: null }],
      ['unapproved', { approved: 0 }],
    ] as const;
    for (const [id, overrides] of ineligible) {
      addUser(id, 'dept-a', overrides);
      addExam(`${id}-exam`, id);
    }
    addUser('foreign', 'foreign-dept', { companyId: 'company-b' });
    addExam('foreign-exam', 'foreign');
    addUser('no-event');

    const projection = getProtectedDashboardProjection({
      companyId: 'company-a',
      period: '1m',
      now: NOW,
    });

    expect(projection.metrics.examActivity).toEqual({ status: 'visible', value: 10 });
    expect(executedSql.join('\n')).toMatch(/COUNT\s*\(\s*DISTINCT/i);
  });

  it('counts only completed exam events by completed_date inside the fixed period', () => {
    addEligibleExamContributors(9);
    addUser('pending-person');
    addExam('pending-exam', 'pending-person', '2026-07-10T12:00:00.000Z', {
      status: 'pending',
      completedDate: null,
    });

    const withPending = getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', now: NOW,
    });
    expect(withPending.metrics.examActivity.status).toBe('suppressed');

    addExam('completed-exam', 'pending-person', '2026-07-11T12:00:00.000Z');
    expect(getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', now: NOW,
    }).metrics.examActivity).toEqual({ status: 'visible', value: 10 });
  });

  it('applies row, column and total complementary suppression to an age matrix', () => {
    for (let index = 1; index <= 9; index += 1) {
      addUser(`a-${index}`, 'dept-a');
      addExam(`a-exam-${index}`, `a-${index}`);
    }
    for (let index = 1; index <= 10; index += 1) {
      addUser(`b-${index}`, 'dept-b');
      addExam(`b-exam-${index}`, `b-${index}`);
    }

    const projection = getProtectedDashboardProjection({
      companyId: 'company-a',
      period: '1m',
      now: NOW,
    });

    expect(projection.ageDistribution.find((cell) => cell.label === '26-35')?.metric)
      .toMatchObject({ status: 'suppressed', reason: 'complementary' });
    expect(projection.metrics.examActivity)
      .toMatchObject({ status: 'suppressed', reason: 'complementary' });
    expect(projection.departments.map((department) => department.metric))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ status: 'suppressed' }),
        expect.objectContaining({ status: 'suppressed' }),
      ]));
  });

  it('uses tenant-scoped department IDs and a successive filter drops 10 contributors to 9', () => {
    addEligibleExamContributors(9, 'dept-a');
    addUser('dept-b-person', 'dept-b');
    addExam('dept-b-exam', 'dept-b-person');

    expect(getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', now: NOW,
    }).metrics.examActivity).toEqual({ status: 'visible', value: 10 });
    expect(getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', departmentId: 'dept-a', now: NOW,
    }).metrics.examActivity.status).toBe('suppressed');
    expect(() => getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', departmentId: 'foreign-dept', now: NOW,
    })).toThrow(/departamento/i);
  });

  it('suppresses adjacent visible months when their stable participant intersection is 9', () => {
    for (let index = 1; index <= 11; index += 1) addUser(`monthly-${index}`);
    for (let index = 1; index <= 10; index += 1) {
      addExam(`jan-${index}`, `monthly-${index}`, '2026-01-15T12:00:00.000Z');
    }
    for (let index = 2; index <= 11; index += 1) {
      addExam(`feb-${index}`, `monthly-${index}`, '2026-02-15T12:00:00.000Z');
    }

    const projection = getProtectedDashboardProjection({
      companyId: 'company-a',
      period: '3m',
      now: '2026-03-01T00:00:00.000Z',
    });
    const jan = projection.examActivitySeries.find((point) => point.period === '2026-01');
    const feb = projection.examActivitySeries.find((point) => point.period === '2026-02');

    expect(jan?.metric.status).toBe('suppressed');
    expect(feb?.metric.status).toBe('suppressed');
  });

  it('passes empty fixed age and calendar-month buckets through the privacy kernel', () => {
    const projection = getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', now: NOW,
    });

    expect(projection.ageDistribution.map(({ label }) => label)).toEqual([
      '18-25', '26-35', '36-45', '46-55', '56+',
    ]);
    expect(projection.ageDistribution.every(({ metric }) => metric.status === 'suppressed')).toBe(true);
    expect(projection.examActivitySeries.map(({ period }) => period)).toEqual([
      '2026-06', '2026-07',
    ]);
    expect(projection.examActivitySeries.every(({ metric }) => metric.status === 'suppressed')).toBe(true);
  });

  it('materializes an unassigned age cohort so totals cannot reveal a hidden person', () => {
    for (let index = 1; index <= 10; index += 1) addUser(`assigned-${index}`, 'dept-a');
    addUser('unassigned-person', null);

    const projection = getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', now: NOW,
    });
    const unassigned = projection.departments.find(({ id }) => id === '__unassigned__');

    expect(unassigned).toBeDefined();
    expect(unassigned?.metric.status).toBe('suppressed');
    expect(JSON.stringify(projection)).not.toContain('unassigned-person');
  });

  it('clamps month subtraction at month end instead of overflowing into March', () => {
    for (let index = 1; index <= 10; index += 1) {
      const userId = `month-end-${index}`;
      addUser(userId);
      addExam(`month-end-exam-${index}`, userId, '2026-02-28T12:00:00.000Z');
    }

    const projection = getProtectedDashboardProjection({
      companyId: 'company-a', period: '1m', now: '2026-03-31T12:00:00.000Z',
    });
    expect(projection.metrics.examActivity).toEqual({ status: 'visible', value: 10 });
    expect(projection.examActivitySeries.map(({ period }) => period)).toEqual([
      '2026-02', '2026-03',
    ]);
  });

  it('permits only fixed filter buckets', () => {
    expect(dashboardQuerySchema.safeParse({ period: '3m', departmentId: 'dept-a' }).success).toBe(true);
    expect(dashboardQuerySchema.safeParse({ period: '2m' }).success).toBe(false);
    expect(communicationsQuerySchema.safeParse({ period: '30' }).success).toBe(true);
    expect(communicationsQuerySchema.safeParse({ period: '31' }).success).toBe(false);
  });
});

describe('protected communications projection', () => {
  it('uses an immutable operational allowlist and excludes content and sensitive actions', () => {
    for (let index = 1; index <= 10; index += 1) {
      const userId = `recipient-${index}`;
      addUser(userId);
      addNotification(`campaign-${index}`, userId, 'campaign', '2026-07-14T12:00:00.000Z', 'campaign_delivery');
      addNotification(`lesson-${index}`, userId, 'lesson', '2026-07-14T12:00:00.000Z', 'lesson_delivery');
      addNotification(`agenda-system-${index}`, userId, 'system', '2026-07-14T12:00:00.000Z');
      for (const excludedType of ['alert', 'reminder', 'challenge', 'badge', 'level', 'streak', 'gamification', 'reward']) {
        addNotification(`${excludedType}-${index}`, userId, excludedType, '2026-07-14T12:00:00.000Z');
      }
      addNotification(`agenda-${index}`, userId, 'system', '2026-07-14T12:00:00.000Z', 'agenda');
      addNotification(`exam-${index}`, userId, 'system', '2026-07-14T12:00:00.000Z', 'exam');
    }
    addUser('unclassified-recipient');
    addNotification('unclassified-campaign', 'unclassified-recipient', 'campaign', '2026-07-14T12:00:00.000Z');
    addNotification('manual-lesson', 'unclassified-recipient', 'lesson', '2026-07-14T12:00:00.000Z', 'manual');

    const projection = getProtectedCommunicationsProjection({
      companyId: 'company-a', period: '7', now: NOW,
    });

    expect(Object.isFrozen(SAFE_COMMUNICATION_ACTIONS)).toBe(true);
    expect(projection.actions.map(({ action }) => action)).toEqual([
      'campaign_delivery', 'lesson_delivery',
    ]);
    expect(projection.actions.map(({ metric }) => metric)).toEqual([
      { status: 'visible', value: 10 },
      { status: 'visible', value: 10 },
    ]);
    expect(JSON.stringify(projection)).not.toMatch(/86421|title|message|notes|content|alert|reminder|agenda|exam|appointment|mood|wellbeing|semaforo/i);
    expect(executedSql.some((sql) => (
      /COUNT\s*\(\s*DISTINCT\s+n\.user_id\s*\)/i.test(sql)
      && /FROM\s+notifications\s+n/i.test(sql)
    ))).toBe(true);
  });

  it('suppresses an overlapping 7-day window when each side has 10 but only 9 are stable', () => {
    for (let index = 1; index <= 11; index += 1) addUser(`window-${index}`);
    for (let index = 1; index <= 9; index += 1) {
      addNotification(`stable-${index}`, `window-${index}`, 'campaign', '2026-07-12T12:00:00.000Z', 'campaign_delivery');
    }
    addNotification('current-only', 'window-10', 'campaign', '2026-07-16T06:00:00.000Z', 'campaign_delivery');
    addNotification('previous-only', 'window-11', 'campaign', '2026-07-08T18:00:00.000Z', 'campaign_delivery');

    const projection = getProtectedCommunicationsProjection({
      companyId: 'company-a', period: '7', now: NOW,
    });

    expect(projection.actions.find(({ action }) => action === 'campaign_delivery')?.metric.status)
      .toBe('suppressed');
  });
});

describe('protected route and cache boundaries', () => {
  it('keeps protected HTTP responses private and removes legacy report sources', () => {
    const dashboardRoute = readFileSync('src/app/api/dashboard/route.ts', 'utf8');
    const historyRoute = readFileSync('src/app/api/analytics/history/route.ts', 'utf8');
    const communicationsRoute = readFileSync('src/app/api/analytics/communications/route.ts', 'utf8');
    const allRoutes = [dashboardRoute, historyRoute, communicationsRoute];

    for (const source of allRoutes) {
      expect(source).toContain('private, no-store');
      expect(source).toMatch(/Vary['\"]?\s*[:,]\s*['\"]Cookie/);
    }
    expect(historyRoute).toContain('status: 410');
    expect(historyRoute).not.toMatch(/getReadDb|initDb|users\.points|points_earned|ranking/i);
    expect(dashboardRoute).not.toMatch(/healthRisk|getReportConfigs|getDepartmentRanking|getROIData/);
    expect(communicationsRoute).not.toMatch(/title|message|invites|alertCount|activity_log/);
  });

  it('uses no-store fetches and scope-complete SWR keys without protected fallback data', () => {
    const dashboardHook = readFileSync('src/hooks/useDashboard.ts', 'utf8');
    const authHook = readFileSync('src/hooks/useAuth.ts', 'utf8');
    const historyPage = readFileSync('src/app/(platform)/historico/page.tsx', 'utf8');
    const communicationsPage = readFileSync('src/app/(platform)/analytics-emails/page.tsx', 'utf8');

    for (const source of [dashboardHook, historyPage, communicationsPage]) {
      expect(source).toContain("cache: 'no-store'");
      expect(source).toContain('revalidateOnFocus: true');
      expect(source).toContain('dedupingInterval: 0');
      expect(source).toContain('keepPreviousData: false');
      expect(source).not.toContain('fallbackData');
    }
    expect(dashboardHook).toMatch(/companyId[\s\S]*role[\s\S]*period[\s\S]*departmentId/);
    expect(authHook).toContain('clearProtectedReportCaches');
    expect(authHook).toMatch(
      /if \(!data\?\.user\) \{[\s\S]*await transitionAuthenticatedScope\(null\);[\s\S]*setUser\(null\);/,
    );
    expect(authHook).not.toMatch(/companyId[\s\S]{0,80}localStorage\.setItem/);
  });
});
