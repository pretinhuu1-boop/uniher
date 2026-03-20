import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface CompanyRow {
  id: string;
  name: string;
  trade_name: string | null;
  cnpj: string;
  sector: string | null;
  plan: string;
  is_active: number;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

export function getCompanyById(id: string): CompanyRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as CompanyRow | undefined;
}

export function getCompanyByCnpj(cnpj: string): CompanyRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM companies WHERE cnpj = ?').get(cnpj) as CompanyRow | undefined;
}

export async function createCompany(data: {
  name: string;
  tradeName?: string;
  cnpj: string;
  sector?: string;
  plan?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}): Promise<CompanyRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO companies (id, name, trade_name, cnpj, sector, plan, contact_name, contact_email, contact_phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.tradeName || null,
      data.cnpj,
      data.sector || null,
      data.plan || 'trial',
      data.contactName || null,
      data.contactEmail || null,
      data.contactPhone || null
    );

    return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as CompanyRow;
  });
}

export interface CompanyWithStats extends CompanyRow {
  user_count: number;
  department_count: number;
}

export function listAllCompanies(): CompanyWithStats[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS user_count,
      (SELECT COUNT(*) FROM departments d WHERE d.company_id = c.id) AS department_count
    FROM companies c
    ORDER BY c.created_at DESC
  `).all() as CompanyWithStats[];
}

export async function updateCompany(id: string, data: Partial<{
  name: string;
  tradeName: string;
  sector: string;
  plan: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}>): Promise<CompanyRow> {
  const writeQueue = getWriteQueue();

  return writeQueue.enqueue((db) => {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.tradeName !== undefined) { fields.push('trade_name = ?'); values.push(data.tradeName); }
    if (data.sector !== undefined) { fields.push('sector = ?'); values.push(data.sector); }
    if (data.plan !== undefined) { fields.push('plan = ?'); values.push(data.plan); }
    if (data.logoUrl !== undefined) { fields.push('logo_url = ?'); values.push(data.logoUrl); }
    if (data.primaryColor !== undefined) { fields.push('primary_color = ?'); values.push(data.primaryColor); }
    if (data.secondaryColor !== undefined) { fields.push('secondary_color = ?'); values.push(data.secondaryColor); }
    if (data.contactName !== undefined) { fields.push('contact_name = ?'); values.push(data.contactName); }
    if (data.contactEmail !== undefined) { fields.push('contact_email = ?'); values.push(data.contactEmail); }
    if (data.contactPhone !== undefined) { fields.push('contact_phone = ?'); values.push(data.contactPhone); }

    if (fields.length === 0) {
      return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as CompanyRow;
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return db.prepare('SELECT * FROM companies WHERE id = ?').get(id) as CompanyRow;
  });
}
