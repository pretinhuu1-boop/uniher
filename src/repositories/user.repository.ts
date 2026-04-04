import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface UserRow {
  id: string;
  company_id: string | null;
  department_id: string | null;
  name: string;
  nickname: string | null;
  email: string;
  password_hash: string;
  role: string;
  is_master_admin: number;
  avatar_url: string | null;
  level: number;
  points: number;
  streak: number;
  blocked: number; // 0 or 1
  approved: number; // 0 = pending, 1 = approved
  must_change_password: number;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  last_active: string | null;
  also_collaborator: number; // 0 or 1
  created_at: string;
  updated_at: string;
  department_name?: string | null;
}

export type PublicUser = Omit<UserRow, 'password_hash'>;

export function getUserById(id: string): UserRow | undefined {
  const db = getReadDb();
  return db.prepare(`
    SELECT u.*, d.name as department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = ?
  `).get(id) as UserRow | undefined;
}

export function getUserByEmail(email: string): UserRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email) as UserRow | undefined;
}

export function getUsersByCompany(companyId: string, cursor?: string, limit = 20): UserRow[] {
  const db = getReadDb();
  if (cursor) {
    return db.prepare(
      'SELECT * FROM users WHERE company_id = ? AND id > ? ORDER BY id LIMIT ?'
    ).all(companyId, cursor, limit) as UserRow[];
  }
  return db.prepare(
    'SELECT * FROM users WHERE company_id = ? ORDER BY id LIMIT ?'
  ).all(companyId, limit) as UserRow[];
}

export function getUsersByDepartment(departmentId: string): UserRow[] {
  const db = getReadDb();
  return db.prepare(
    'SELECT * FROM users WHERE department_id = ? ORDER BY points DESC'
  ).all(departmentId) as UserRow[];
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  companyId: string | null;
  departmentId?: string;
  isMasterAdmin?: boolean;
}): Promise<UserRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO users (id, company_id, department_id, name, email, password_hash, role, is_master_admin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.companyId,
      data.departmentId || null,
      data.name,
      data.email,
      data.passwordHash,
      data.role,
      data.isMasterAdmin ? 1 : 0
    );

    db.prepare(`
      INSERT INTO user_preferences (user_id, pref_key, pref_value, updated_at)
      VALUES (?, 'first_access_tour_completed', '0', datetime('now'))
      ON CONFLICT(user_id, pref_key) DO UPDATE SET
        pref_value = excluded.pref_value,
        updated_at = excluded.updated_at
    `).run(id);

    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  });
}

// Whitelist of fields that can be dynamically updated
const ALLOWED_USER_UPDATE_FIELDS: Record<string, string> = {
  name: 'name',
  avatarUrl: 'avatar_url',
  level: 'level',
  points: 'points',
  streak: 'streak',
  lastActive: 'last_active',
};

export async function updateUser(id: string, data: Partial<{
  name: string;
  avatarUrl: string;
  level: number;
  points: number;
  streak: number;
  lastActive: string;
}>): Promise<UserRow> {
  const writeQueue = getWriteQueue();

  return writeQueue.enqueue((db) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    // Only process fields present in the whitelist
    for (const [key, column] of Object.entries(ALLOWED_USER_UPDATE_FIELDS)) {
      const value = (data as Record<string, unknown>)[key];
      if (value !== undefined) {
        fields.push(`${column} = ?`);
        values.push(value);
      }
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  });
}

export async function setArchetype(userId: string, archetypeId: string): Promise<void> {
  const writeQueue = getWriteQueue();
  return writeQueue.enqueue((db) => {
    db.prepare('UPDATE users SET archetype_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(archetypeId, userId);
  });
}

export function countUsersByCompany(companyId: string): number {
  const db = getReadDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM users WHERE company_id = ?').get(companyId) as { count: number };
  return row.count;
}

export function countUsersByRole(companyId: string, role: string): number {
  const db = getReadDb();
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM users WHERE company_id = ? AND role = ?'
  ).get(companyId, role) as { count: number };
  return row.count;
}

/** Remove password_hash do retorno */
export function toPublicUser(user: UserRow): PublicUser {
  const { password_hash: _, ...publicUser } = user;
  return publicUser;
}
