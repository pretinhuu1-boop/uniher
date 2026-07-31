import { getReadDb, getWriteQueue } from '@/lib/db';
import {
  runAsActiveCompanyActor,
  runAsActiveMasterAdminActor,
} from '@/lib/security/active-rh-actor';
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
  deleted_at: string | null;
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

export interface CreateCompanyInput {
  name: string;
  tradeName?: string;
  cnpj: string;
  sector?: string;
  plan?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

function insertCompany(
  db: import('better-sqlite3').Database,
  id: string,
  data: CreateCompanyInput,
): CompanyRow {
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
}

export async function createCompany(data: CreateCompanyInput): Promise<CompanyRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => insertCompany(db, id, data));
}

export async function createCompanyAsMasterAdmin(
  data: CreateCompanyInput,
  actorId: string,
): Promise<CompanyRow | null> {
  const writeQueue = getWriteQueue();
  const id = nanoid();
  const result = await writeQueue.enqueue((db) => (
    runAsActiveMasterAdminActor(db, actorId, () => insertCompany(db, id, data))
  ), 'create company as Master Admin', { retryOnFailure: false });

  return result.authorized ? result.value : null;
}

export interface CompanyWithStats extends CompanyRow {
  user_count: number;
  department_count: number;
}

export interface UpdateCompanyInput {
  name?: string;
  tradeName?: string;
  sector?: string;
  plan?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

function updateCompanyRow(
  db: import('better-sqlite3').Database,
  id: string,
  data: UpdateCompanyInput,
  activeOnly = false,
): CompanyRow {
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

  const activePredicate = activeOnly ? ' AND is_active = 1 AND deleted_at IS NULL' : '';
  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    const result = db.prepare(
      `UPDATE companies SET ${fields.join(', ')} WHERE id = ?${activePredicate}`,
    ).run(...values);
    if (result.changes !== 1) {
      throw new Error('Empresa nao encontrada ou inativa.');
    }
  }

  const company = db.prepare(
    `SELECT * FROM companies WHERE id = ?${activePredicate}`,
  ).get(id) as CompanyRow | undefined;
  if (!company) {
    throw new Error('Empresa nao encontrada ou inativa.');
  }

  return company;
}

export function listAllCompanies(): CompanyWithStats[] {
  const db = getReadDb();
  return db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.deleted_at IS NULL) AS user_count,
      (SELECT COUNT(*) FROM departments d WHERE d.company_id = c.id) AS department_count
    FROM companies c
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC
  `).all() as CompanyWithStats[];
}

export async function updateCompany(id: string, data: UpdateCompanyInput): Promise<CompanyRow> {
  const writeQueue = getWriteQueue();

  return writeQueue.enqueue((db) => updateCompanyRow(db, id, data));
}

export async function updateCompanyProfileAsActor(input: {
  actorId: string;
  actorRole: 'rh' | 'admin';
  companyId: string;
  company: UpdateCompanyInput;
  feedCompanyEnabled?: boolean;
}): Promise<CompanyRow | null> {
  const result = await getWriteQueue().enqueue((db) => runAsActiveCompanyActor(
    db,
    input.actorId,
    input.companyId,
    input.actorRole,
    () => {
      const company = updateCompanyRow(db, input.companyId, input.company, true);
      if (input.feedCompanyEnabled !== undefined) {
        db.prepare(`
          INSERT INTO company_settings (id, company_id, setting_key, setting_value, updated_at)
          VALUES (lower(hex(randomblob(16))), ?, 'feed_company_enabled', ?, datetime('now'))
          ON CONFLICT(company_id, setting_key)
          DO UPDATE SET setting_value = excluded.setting_value, updated_at = datetime('now')
        `).run(input.companyId, input.feedCompanyEnabled ? '1' : '0');
      }
      return company;
    },
  ), 'update company profile as active actor', { retryOnFailure: false });

  return result.authorized ? result.value : null;
}
