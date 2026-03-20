import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface UserRow {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  avatar_url: string | null;
  level: number;
  points: number;
  streak: number;
  blocked: number; // 0 or 1
  approved: number; // 0 = pending, 1 = approved
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicUser = Omit<UserRow, 'password_hash'>;

export function getUserById(id: string): UserRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

export function getUserByEmail(email: string): UserRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
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
  companyId: string;
  departmentId?: string;
}): Promise<UserRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO users (id, company_id, department_id, name, email, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.companyId, data.departmentId || null, data.name, data.email, data.passwordHash, data.role);

    return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  });
}

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

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatarUrl); }
    if (data.level !== undefined) { fields.push('level = ?'); values.push(data.level); }
    if (data.points !== undefined) { fields.push('points = ?'); values.push(data.points); }
    if (data.streak !== undefined) { fields.push('streak = ?'); values.push(data.streak); }
    if (data.lastActive !== undefined) { fields.push('last_active = ?'); values.push(data.lastActive); }

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
