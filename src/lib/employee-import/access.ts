import type Database from 'better-sqlite3';

export interface EmployeeImportAuth {
  userId: string;
  companyId?: string | null;
  role: string;
}

export interface EmployeeImportActor {
  id: string;
  companyId: string;
  role: 'rh' | 'admin';
  companyName: string;
  email: string;
}

export function getEmployeeImportActor(
  db: Database.Database,
  auth: EmployeeImportAuth,
): EmployeeImportActor | null {
  if (!auth.companyId) return null;
  if (auth.role !== 'rh' && auth.role !== 'admin') return null;

  const actor = db.prepare(`
    SELECT
      u.id,
      u.company_id AS companyId,
      u.role,
      u.email,
      c.name AS companyName
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
      AND u.company_id = ?
      AND u.role = ?
      AND u.role IN ('rh', 'admin')
      AND u.deleted_at IS NULL
      AND COALESCE(u.blocked, 0) = 0
      AND COALESCE(u.approved, 0) = 1
      AND COALESCE(c.is_active, 0) = 1
      AND c.deleted_at IS NULL
  `).get(auth.userId, auth.companyId, auth.role) as EmployeeImportActor | undefined;

  return actor ?? null;
}
