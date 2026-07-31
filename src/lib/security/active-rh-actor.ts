import type Database from 'better-sqlite3';

export function hasActiveRhActor(
  db: Database.Database,
  actorId: string,
  companyId: string,
): boolean {
  const actor = db.prepare(`
    SELECT u.id
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
      AND u.company_id = ?
      AND u.role = 'rh'
      AND u.approved = 1
      AND u.blocked = 0
      AND u.deleted_at IS NULL
      AND c.is_active = 1
      AND c.deleted_at IS NULL
  `).get(actorId, companyId);

  return Boolean(actor);
}
