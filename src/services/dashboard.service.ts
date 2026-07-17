import type Database from 'better-sqlite3';
import { z } from 'zod';

import { getReadDb } from '@/lib/db';
import {
  applyComplementarySuppression,
  notComputableMetric,
  protectMetric,
  protectTemporalPair,
} from '@/lib/privacy/aggregate-suppression';
import type {
  AggregateCell,
  SuppressionConstraint,
} from '@/lib/privacy/aggregate-suppression';
import {
  COMMUNICATION_PERIODS,
  DASHBOARD_PERIODS,
} from '@/types/platform';
import type {
  CommunicationPeriod,
  DashboardPeriod,
  ProtectedAgeMetric,
  ProtectedCommunicationsProjection,
  ProtectedDashboardProjection,
  ProtectedDepartmentMetric,
  ProtectedSeriesMetric,
  SafeCommunicationAction,
} from '@/types/platform';
import type { ProtectedMetric } from '@/types/privacy';

const ISO_DATE_TIME = z.string().datetime({ offset: true });

export const dashboardQuerySchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).default('1m'),
  departmentId: z.string().trim().min(1).max(128).optional(),
}).strict();

export const communicationsQuerySchema = z.object({
  period: z.enum(COMMUNICATION_PERIODS).default('30'),
}).strict();

interface DashboardProjectionInput {
  companyId: string;
  period: DashboardPeriod;
  departmentId?: string;
  now?: string;
}

interface CommunicationsProjectionInput {
  companyId: string;
  period: CommunicationPeriod;
  now?: string;
}

interface ParticipantRow {
  participant_id: string;
}

interface PeriodParticipantRow extends ParticipantRow {
  period: string;
}

interface DepartmentRow {
  id: string;
  name: string;
  color: string;
}

interface AgeParticipantRow extends ParticipantRow {
  department_id: string;
  age_bucket: string;
}

interface CommunicationParticipantRow extends ParticipantRow {
  type: SafeCommunicationType;
}

interface CommunicationCountRow {
  type: SafeCommunicationType;
  distinct_contributors: number;
}

interface CommunicationWindow {
  participants: Map<SafeCommunicationType, Set<string>>;
  counts: Map<SafeCommunicationType, number>;
}

type SafeCommunicationType = 'campaign' | 'lesson';

interface SafeCommunicationDefinition {
  type: SafeCommunicationType;
  source: SafeCommunicationAction;
  action: SafeCommunicationAction;
  label: string;
}

export const SAFE_COMMUNICATION_ACTIONS: readonly SafeCommunicationDefinition[] =
  Object.freeze([
    Object.freeze({
      type: 'campaign',
      source: 'campaign_delivery',
      action: 'campaign_delivery',
      label: 'Entregas de campanha',
    }),
    Object.freeze({
      type: 'lesson',
      source: 'lesson_delivery',
      action: 'lesson_delivery',
      label: 'Entregas de li\u00e7\u00e3o',
    }),
  ]);

const UNASSIGNED_DEPARTMENT: DepartmentRow = Object.freeze({
  id: '__unassigned__',
  name: 'Sem departamento',
  color: '#8A8F86',
});

const AGE_BUCKETS = Object.freeze([
  { label: '18-25', color: '#C9A264' },
  { label: '26-35', color: '#E8849E' },
  { label: '36-45', color: '#3E7D5A' },
  { label: '46-55', color: '#378ADD' },
  { label: '56+', color: '#EF9F27' },
]);

const PERIOD_MONTHS: Record<DashboardPeriod, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '1a': 12,
};

const PERIOD_DAYS: Record<CommunicationPeriod, number> = {
  '7': 7,
  '30': 30,
  '90': 90,
};

function normalizedNow(now?: string): string {
  const candidate = now ?? new Date().toISOString();
  const result = ISO_DATE_TIME.safeParse(candidate);
  if (!result.success) throw new Error('Data interna inv\u00e1lida para proje\u00e7\u00e3o protegida.');
  return new Date(result.data).toISOString();
}

function shiftUtc(value: string, options: { months?: number; days?: number }): string {
  const date = new Date(value);
  if (options.months) {
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + options.months);
    const daysInTargetMonth = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      0,
    )).getUTCDate();
    date.setUTCDate(Math.min(originalDay, daysInTargetMonth));
  }
  if (options.days) date.setUTCDate(date.getUTCDate() + options.days);
  return date.toISOString();
}

function getFixedMonthBuckets(start: string, end: string): string[] {
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCDate(1);
  last.setUTCHours(0, 0, 0, 0);
  const periods: string[] = [];

  while (cursor <= last) {
    periods.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return periods;
}

function eligibleContributorSql(alias = 'u'): string {
  return `
    ${alias}.deleted_at IS NULL
    AND ${alias}.blocked = 0
    AND ${alias}.approved = 1
    AND (
      ${alias}.role = 'colaboradora'
      OR ${alias}.also_collaborator = 1
    )
  `;
}

function departmentClause(departmentId?: string): string {
  return departmentId ? 'AND u.department_id = ?' : '';
}

function departmentParams(departmentId?: string): string[] {
  return departmentId ? [departmentId] : [];
}

function publicMetric<T>(cell: AggregateCell<T> | undefined): ProtectedMetric<T> {
  if (!cell) return protectMetric(undefined as T, 0);
  if (cell.status === 'visible') return { status: 'visible', value: cell.value };
  return { status: 'suppressed', reason: cell.reason, message: cell.message };
}

function validateDepartment(
  db: Database.Database,
  companyId: string,
  departmentId?: string,
): void {
  if (!departmentId) return;
  const department = db.prepare(
    'SELECT id FROM departments WHERE id = ? AND company_id = ?',
  ).get(departmentId, companyId);
  if (!department) throw new Error('Departamento inv\u00e1lido para esta empresa.');
}

function getExamActivityMetric(
  db: Database.Database,
  companyId: string,
  departmentId: string | undefined,
  start: string,
  end: string,
): ProtectedMetric<number> {
  const row = db.prepare(`
    SELECT COUNT(DISTINCT ue.user_id) AS distinct_contributors
    FROM user_exams ue
    JOIN users u ON u.id = ue.user_id
    WHERE u.company_id = ?
      AND ${eligibleContributorSql()}
      AND ue.status = 'completed'
      AND ue.completed_date IS NOT NULL
      AND date(ue.completed_date) >= date(?)
      AND date(ue.completed_date) <= date(?)
      ${departmentClause(departmentId)}
  `).get(companyId, start, end, ...departmentParams(departmentId)) as {
    distinct_contributors: number;
  };

  const totalMetric = protectMetric(row.distinct_contributors, row.distinct_contributors);
  if (departmentId) return totalMetric;

  const participantRows = db.prepare(`
    SELECT
      COALESCE(u.department_id, 'unassigned') AS period,
      ue.user_id AS participant_id
    FROM user_exams ue
    JOIN users u ON u.id = ue.user_id
    WHERE u.company_id = ?
      AND ${eligibleContributorSql()}
      AND ue.status = 'completed'
      AND ue.completed_date IS NOT NULL
      AND date(ue.completed_date) >= date(?)
      AND date(ue.completed_date) <= date(?)
    GROUP BY u.department_id, ue.user_id
  `).all(companyId, start, end) as PeriodParticipantRow[];
  const participantsByDepartment = new Map<string, Set<string>>();
  for (const participant of participantRows) {
    const ids = participantsByDepartment.get(participant.period) ?? new Set<string>();
    ids.add(participant.participant_id);
    participantsByDepartment.set(participant.period, ids);
  }
  const departmentCells: AggregateCell<number>[] = [...participantsByDepartment]
    .map(([id, participants]) => ({
      id: `exam:department:${id}`,
      ...protectMetric(participants.size, participants.size),
    }));
  if (departmentCells.length === 0) return totalMetric;
  const hiddenDepartmentCells = departmentCells.filter((cell) => cell.status === 'suppressed');
  const visibleDepartmentCells = departmentCells.filter((cell) => cell.status === 'visible');
  if (hiddenDepartmentCells.length !== 1 || visibleDepartmentCells.length === 0) {
    return totalMetric;
  }

  const protectedCells = applyComplementarySuppression(
    [{ id: 'exam:total', ...totalMetric }, ...departmentCells],
    [{
      id: 'exam:department-total',
      kind: 'total',
      cellIds: ['exam:total', ...departmentCells.map(({ id }) => id)],
    }],
  );
  return publicMetric(protectedCells.find(({ id }) => id === 'exam:total'));
}

function getExamSeries(
  db: Database.Database,
  companyId: string,
  departmentId: string | undefined,
  start: string,
  end: string,
): ProtectedSeriesMetric[] {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', ue.completed_date) AS period,
      ue.user_id AS participant_id
    FROM user_exams ue
    JOIN users u ON u.id = ue.user_id
    WHERE u.company_id = ?
      AND ${eligibleContributorSql()}
      AND ue.status = 'completed'
      AND ue.completed_date IS NOT NULL
      AND date(ue.completed_date) >= date(?)
      AND date(ue.completed_date) <= date(?)
      ${departmentClause(departmentId)}
    GROUP BY period, ue.user_id
    ORDER BY period ASC, ue.user_id ASC
  `).all(companyId, start, end, ...departmentParams(departmentId)) as PeriodParticipantRow[];

  const participantsByPeriod = new Map<string, Set<string>>();
  for (const row of rows) {
    const participants = participantsByPeriod.get(row.period) ?? new Set<string>();
    participants.add(row.participant_id);
    participantsByPeriod.set(row.period, participants);
  }

  const periods = getFixedMonthBuckets(start, end);
  const metrics = new Map<string, ProtectedMetric<number>>(
    periods.map((period) => {
      const count = participantsByPeriod.get(period)?.size ?? 0;
      return [period, protectMetric(count, count)];
    }),
  );

  for (let index = 1; index < periods.length; index += 1) {
    const previousPeriod = periods[index - 1];
    const currentPeriod = periods[index];
    const previousParticipants = participantsByPeriod.get(previousPeriod) ?? new Set<string>();
    const currentParticipants = participantsByPeriod.get(currentPeriod) ?? new Set<string>();
    const protectedPair = protectTemporalPair(
      { value: previousParticipants.size, participantIds: previousParticipants },
      { value: currentParticipants.size, participantIds: currentParticipants },
    );
    if (protectedPair.previous.status === 'suppressed') {
      metrics.set(previousPeriod, protectedPair.previous);
    }
    if (protectedPair.current.status === 'suppressed') {
      metrics.set(currentPeriod, protectedPair.current);
    }
  }

  return periods.map((period) => ({
    period,
    metric: metrics.get(period) ?? protectMetric(0, 0),
  }));
}

function getDepartments(
  db: Database.Database,
  companyId: string,
  departmentId?: string,
): DepartmentRow[] {
  return db.prepare(`
    SELECT id, name, color
    FROM departments
    WHERE company_id = ?
      ${departmentId ? 'AND id = ?' : ''}
    ORDER BY name ASC
  `).all(companyId, ...departmentParams(departmentId)) as DepartmentRow[];
}

function getProtectedAgeMatrix(
  db: Database.Database,
  companyId: string,
  departments: readonly DepartmentRow[],
  departmentId: string | undefined,
  now: string,
): { departments: ProtectedDepartmentMetric[]; ageDistribution: ProtectedAgeMetric[] } {
  const rows = db.prepare(`
    SELECT
      u.id AS participant_id,
      COALESCE(u.department_id, '__unassigned__') AS department_id,
      CASE
        WHEN CAST((julianday(?) - julianday(u.birth_date)) / 365.25 AS INTEGER) BETWEEN 18 AND 25 THEN '18-25'
        WHEN CAST((julianday(?) - julianday(u.birth_date)) / 365.25 AS INTEGER) BETWEEN 26 AND 35 THEN '26-35'
        WHEN CAST((julianday(?) - julianday(u.birth_date)) / 365.25 AS INTEGER) BETWEEN 36 AND 45 THEN '36-45'
        WHEN CAST((julianday(?) - julianday(u.birth_date)) / 365.25 AS INTEGER) BETWEEN 46 AND 55 THEN '46-55'
        WHEN CAST((julianday(?) - julianday(u.birth_date)) / 365.25 AS INTEGER) > 55 THEN '56+'
        ELSE NULL
      END AS age_bucket
    FROM users u
    WHERE u.company_id = ?
      AND ${eligibleContributorSql()}
      AND u.birth_date IS NOT NULL
      AND u.birth_date != ''
      ${departmentClause(departmentId)}
  `).all(now, now, now, now, now, companyId, ...departmentParams(departmentId)) as AgeParticipantRow[];

  const validRows = rows.filter((row) => AGE_BUCKETS.some(({ label }) => label === row.age_bucket));
  const presentBuckets = AGE_BUCKETS;
  const matrixDepartments = validRows.some((row) => row.department_id === UNASSIGNED_DEPARTMENT.id)
    ? [...departments, UNASSIGNED_DEPARTMENT]
    : [...departments];
  const cells: AggregateCell<number>[] = [];
  const constraints: SuppressionConstraint[] = [];

  for (const department of matrixDepartments) {
    const departmentRows = validRows.filter((row) => row.department_id === department.id);
    const totalParticipants = new Set(departmentRows.map((row) => row.participant_id));
    cells.push({
      id: `department:${department.id}:total`,
      ...protectMetric(totalParticipants.size, totalParticipants.size),
    });

    const rowCellIds = [`department:${department.id}:total`];
    for (const bucket of presentBuckets) {
      const participants = new Set(
        departmentRows
          .filter((row) => row.age_bucket === bucket.label)
          .map((row) => row.participant_id),
      );
      const cellId = `department:${department.id}:age:${bucket.label}`;
      cells.push({ id: cellId, ...protectMetric(participants.size, participants.size) });
      rowCellIds.push(cellId);
    }
    if (rowCellIds.length >= 2) {
      constraints.push({ id: `row:${department.id}`, kind: 'row', cellIds: rowCellIds });
    }
  }

  const totalParticipants = new Set(validRows.map((row) => row.participant_id));
  cells.push({ id: 'age:grand-total', ...protectMetric(totalParticipants.size, totalParticipants.size) });

  for (const bucket of presentBuckets) {
    const participants = new Set(
      validRows.filter((row) => row.age_bucket === bucket.label).map((row) => row.participant_id),
    );
    const totalId = `age:${bucket.label}:total`;
    cells.push({ id: totalId, ...protectMetric(participants.size, participants.size) });
    const columnIds = [
      totalId,
      ...matrixDepartments.map((department) => `department:${department.id}:age:${bucket.label}`),
    ];
    if (columnIds.length >= 2) {
      constraints.push({ id: `column:${bucket.label}`, kind: 'column', cellIds: columnIds });
    }
  }

  const departmentTotalIds = matrixDepartments.map((department) => `department:${department.id}:total`);
  if (departmentTotalIds.length > 0) {
    constraints.push({
      id: 'total:departments',
      kind: 'total',
      cellIds: ['age:grand-total', ...departmentTotalIds],
    });
  }
  const bucketTotalIds = presentBuckets.map((bucket) => `age:${bucket.label}:total`);
  if (bucketTotalIds.length > 0) {
    constraints.push({
      id: 'total:age-buckets',
      kind: 'total',
      cellIds: ['age:grand-total', ...bucketTotalIds],
    });
  }

  const protectedCells = new Map(
    applyComplementarySuppression(cells, constraints).map((cell) => [cell.id, cell]),
  );

  return {
    departments: matrixDepartments.map((department) => ({
      ...department,
      metric: publicMetric(protectedCells.get(`department:${department.id}:total`)),
    })),
    ageDistribution: presentBuckets.map((bucket) => ({
      ...bucket,
      metric: publicMetric(protectedCells.get(`age:${bucket.label}:total`)),
    })),
  };
}

export function getProtectedDashboardProjection(
  input: DashboardProjectionInput,
): ProtectedDashboardProjection {
  const parsed = dashboardQuerySchema.parse({
    period: input.period,
    departmentId: input.departmentId,
  });
  const now = normalizedNow(input.now);
  const start = shiftUtc(now, { months: -PERIOD_MONTHS[parsed.period] });
  const db = getReadDb();
  validateDepartment(db, input.companyId, parsed.departmentId);

  const departments = getDepartments(db, input.companyId, parsed.departmentId);
  const ageMatrix = getProtectedAgeMatrix(
    db,
    input.companyId,
    departments,
    parsed.departmentId,
    now,
  );

  return {
    filters: {
      period: parsed.period,
      ...(parsed.departmentId ? { departmentId: parsed.departmentId } : {}),
    },
    metrics: {
      examActivity: getExamActivityMetric(
        db,
        input.companyId,
        parsed.departmentId,
        start,
        now,
      ),
      engagement: notComputableMetric(),
      healthRisk: notComputableMetric(),
      campaignParticipation: notComputableMetric(),
      roi: notComputableMetric(),
    },
    departments: ageMatrix.departments,
    ageDistribution: ageMatrix.ageDistribution,
    examActivitySeries: getExamSeries(
      db,
      input.companyId,
      parsed.departmentId,
      start,
      now,
    ),
  };
}

function getCommunicationParticipants(
  db: Database.Database,
  companyId: string,
  start: string,
  end: string,
): CommunicationWindow {
  const types = SAFE_COMMUNICATION_ACTIONS.map(({ type }) => type);
  const allowlistSql = SAFE_COMMUNICATION_ACTIONS
    .map(() => '(n.type = ? AND n.source = ?)')
    .join(' OR ');
  const allowlistParams = SAFE_COMMUNICATION_ACTIONS
    .flatMap(({ type, source }) => [type, source]);
  const rows = db.prepare(`
    SELECT n.type, n.user_id AS participant_id
    FROM notifications n
    JOIN users u ON u.id = n.user_id
    WHERE u.company_id = ?
      AND ${eligibleContributorSql()}
      AND n.created_at >= ?
      AND n.created_at < ?
      AND (${allowlistSql})
    GROUP BY n.type, n.user_id
    ORDER BY n.type ASC, n.user_id ASC
  `).all(
    companyId,
    start,
    end,
    ...allowlistParams,
  ) as CommunicationParticipantRow[];

  const byType = new Map<SafeCommunicationType, Set<string>>(
    types.map((type) => [type, new Set<string>()]),
  );
  for (const row of rows) byType.get(row.type)?.add(row.participant_id);

  const countRows = db.prepare(`
    SELECT n.type, COUNT(DISTINCT n.user_id) AS distinct_contributors
    FROM notifications n
    JOIN users u ON u.id = n.user_id
    WHERE u.company_id = ?
      AND ${eligibleContributorSql()}
      AND n.created_at >= ?
      AND n.created_at < ?
      AND (${allowlistSql})
    GROUP BY n.type
    ORDER BY n.type ASC
  `).all(
    companyId,
    start,
    end,
    ...allowlistParams,
  ) as CommunicationCountRow[];
  const counts = new Map<SafeCommunicationType, number>(
    types.map((type) => [type, 0]),
  );
  for (const row of countRows) counts.set(row.type, row.distinct_contributors);

  return { participants: byType, counts };
}

export function getProtectedCommunicationsProjection(
  input: CommunicationsProjectionInput,
): ProtectedCommunicationsProjection {
  const parsed = communicationsQuerySchema.parse({ period: input.period });
  const now = normalizedNow(input.now);
  const days = PERIOD_DAYS[parsed.period];
  const currentStart = shiftUtc(now, { days: -days });
  const previousStart = shiftUtc(currentStart, { days: -1 });
  const previousEnd = shiftUtc(now, { days: -1 });
  const db = getReadDb();
  const previous = getCommunicationParticipants(db, input.companyId, previousStart, previousEnd);
  const current = getCommunicationParticipants(db, input.companyId, currentStart, now);

  const cells: AggregateCell<number>[] = SAFE_COMMUNICATION_ACTIONS.map((definition) => {
    const previousIds = previous.participants.get(definition.type) ?? new Set<string>();
    const currentIds = current.participants.get(definition.type) ?? new Set<string>();
    const temporal = protectTemporalPair(
      { value: previous.counts.get(definition.type) ?? 0, participantIds: previousIds },
      { value: current.counts.get(definition.type) ?? 0, participantIds: currentIds },
    );
    return { id: definition.action, ...temporal.current };
  });
  const protectedCells = new Map(
    applyComplementarySuppression(cells, [{
      id: 'communications:actions',
      kind: 'series',
      cellIds: cells.map(({ id }) => id),
    }]).map((cell) => [cell.id, cell]),
  );

  return {
    filters: { period: parsed.period },
    actions: SAFE_COMMUNICATION_ACTIONS.map((definition) => ({
      action: definition.action,
      label: definition.label,
      metric: publicMetric(protectedCells.get(definition.action)),
    })),
  };
}
