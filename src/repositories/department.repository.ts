import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface DepartmentRow {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DepartmentStats extends DepartmentRow {
  collaborators: number;
  points: number;
  level: number;
  badges: number;
  engagement_percent: number;
  exams_percent: number;
  avg_streak: number;
}

export function getDepartmentById(id: string): DepartmentRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as DepartmentRow | undefined;
}

export function getDepartmentsByCompany(companyId: string): DepartmentRow[] {
  const db = getReadDb();
  return db.prepare('SELECT * FROM departments WHERE company_id = ? ORDER BY name').all(companyId) as DepartmentRow[];
}

export function getDepartmentStats(companyId: string): DepartmentStats[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT
      d.*,
      COUNT(u.id) as collaborators,
      COALESCE(SUM(u.points), 0) as points,
      COALESCE(MAX(u.level), 1) as level,
      COALESCE(
        (SELECT COUNT(*) FROM user_badges ub
         JOIN users u2 ON u2.id = ub.user_id
         WHERE u2.department_id = d.id), 0
      ) as badges,
      COALESCE(ROUND(AVG(u.streak) * 10, 0), 0) as engagement_percent,
      40 as exams_percent,
      COALESCE(AVG(u.streak), 0) as avg_streak
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id
    WHERE d.company_id = ?
    GROUP BY d.id
    ORDER BY points DESC
  `).all(companyId) as DepartmentStats[];
}

export async function createDepartment(companyId: string, name: string, color?: string): Promise<DepartmentRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare('INSERT INTO departments (id, company_id, name, color) VALUES (?, ?, ?, ?)').run(
      id, companyId, name, color || '#3E7D5A'
    );
    return db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as DepartmentRow;
  });
}
