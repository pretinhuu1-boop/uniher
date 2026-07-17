import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface DepartmentRow {
  id: string;
  company_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function getDepartmentById(id: string): DepartmentRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as DepartmentRow | undefined;
}

export function getDepartmentsByCompany(companyId: string): DepartmentRow[] {
  const db = getReadDb();
  return db.prepare('SELECT * FROM departments WHERE company_id = ? ORDER BY name').all(companyId) as DepartmentRow[];
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
