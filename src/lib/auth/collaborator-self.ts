import type Database from 'better-sqlite3';
import { getReadDb } from '@/lib/db';

interface PersistedCollaboratorCapability {
  role: string;
  also_collaborator: number | null;
}

interface CollaboratorSelfWriteQueue {
  enqueue<T>(operation: (database: Database.Database) => T): Promise<T>;
}

export class CollaboratorSelfWriteError extends Error {
  readonly status = 403;

  constructor() {
    super('Permissão insuficiente');
    this.name = 'CollaboratorSelfWriteError';
  }
}

/** Authorization source of truth for self-owned collaborator resources. */
export function hasCollaboratorSelfCapability(
  userId: string,
  database: Database.Database = getReadDb(),
): boolean {
  const columns = new Set(
    (database.prepare('PRAGMA table_info(users)').all() as { name: string }[])
      .map(({ name }) => name),
  );
  const activeConditions = [
    'id = ?',
    columns.has('deleted_at') ? 'deleted_at IS NULL' : null,
    columns.has('blocked') ? 'COALESCE(blocked, 0) = 0' : null,
    columns.has('approved') ? 'COALESCE(approved, 0) = 1' : null,
  ].filter((condition): condition is string => condition !== null);
  const alsoCollaboratorProjection = columns.has('also_collaborator')
    ? 'also_collaborator'
    : '0 AS also_collaborator';
  const user = database.prepare(`
    SELECT role, ${alsoCollaboratorProjection}
    FROM users
    WHERE ${activeConditions.join(' AND ')}
  `).get(userId) as PersistedCollaboratorCapability | undefined;

  return user?.role === 'colaboradora' || user?.also_collaborator === 1;
}

/** Revalidates persisted capability under the same immediate transaction as the write. */
export async function enqueueCollaboratorSelfWrite<T>(
  queue: CollaboratorSelfWriteQueue,
  userId: string,
  operation: (database: Database.Database) => T,
): Promise<T> {
  return queue.enqueue((database) => {
    const guardedWrite = database.transaction(() => {
      if (!hasCollaboratorSelfCapability(userId, database)) {
        throw new CollaboratorSelfWriteError();
      }
      return operation(database);
    });
    return guardedWrite.immediate();
  });
}
