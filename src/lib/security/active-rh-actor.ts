import type Database from 'better-sqlite3';

export type ActiveActorTransactionResult<T> =
  | { authorized: false }
  | { authorized: true; value: T };

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

export function runAsActiveRhActor<T>(
  db: Database.Database,
  actorId: string,
  companyId: string,
  operation: () => T,
): ActiveActorTransactionResult<T> {
  const transaction = db.transaction(() => {
    if (!hasActiveRhActor(db, actorId, companyId)) {
      return { authorized: false } as const;
    }
    return { authorized: true, value: operation() } as const;
  });

  return transaction.immediate();
}

export function hasActiveCompanyActor(
  db: Database.Database,
  actorId: string,
  companyId: string,
  allowedRoles: string | readonly string[],
): boolean {
  const roles = typeof allowedRoles === 'string' ? [allowedRoles] : allowedRoles;
  if (roles.length === 0) {
    return false;
  }

  const actor = db.prepare(`
    SELECT u.role
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
      AND u.company_id = ?
      AND u.approved = 1
      AND u.blocked = 0
      AND u.deleted_at IS NULL
      AND c.is_active = 1
      AND c.deleted_at IS NULL
  `).get(actorId, companyId) as { role: string } | undefined;

  return Boolean(actor && roles.includes(actor.role));
}

export function runAsActiveCompanyActor<T>(
  db: Database.Database,
  actorId: string,
  companyId: string,
  allowedRoles: string | readonly string[],
  operation: () => T,
): ActiveActorTransactionResult<T> {
  const transaction = db.transaction(() => {
    if (!hasActiveCompanyActor(db, actorId, companyId, allowedRoles)) {
      return { authorized: false } as const;
    }
    return { authorized: true, value: operation() } as const;
  });

  return transaction.immediate();
}

export function hasActiveMasterAdminActor(
  db: Database.Database,
  actorId: string,
): boolean {
  const actor = db.prepare(`
    SELECT id
    FROM users
    WHERE id = ?
      AND role = 'admin'
      AND is_master_admin = 1
      AND approved = 1
      AND blocked = 0
      AND deleted_at IS NULL
  `).get(actorId);

  return Boolean(actor);
}

export function runAsActiveMasterAdminActor<T>(
  db: Database.Database,
  actorId: string,
  operation: () => T,
): ActiveActorTransactionResult<T> {
  const transaction = db.transaction(() => {
    if (!hasActiveMasterAdminActor(db, actorId)) {
      return { authorized: false } as const;
    }
    return { authorized: true, value: operation() } as const;
  });

  return transaction.immediate();
}

export interface ActiveLeaderApprover {
  departmentId: string;
}

export function getActiveLeaderApprover(
  db: Database.Database,
  actorId: string,
  companyId: string,
): ActiveLeaderApprover | undefined {
  const actor = db.prepare(`
    SELECT u.department_id
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.id = ?
      AND u.company_id = ?
      AND u.role = 'lideranca'
      AND u.approved = 1
      AND u.blocked = 0
      AND u.can_approve = 1
      AND u.department_id IS NOT NULL
      AND u.deleted_at IS NULL
      AND c.is_active = 1
      AND c.deleted_at IS NULL
  `).get(actorId, companyId) as { department_id: string } | undefined;

  return actor ? { departmentId: actor.department_id } : undefined;
}
