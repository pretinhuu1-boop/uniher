import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  COMPANY_MODULE_DEFINITIONS,
  canAdminSetCompanyModuleState,
  canRoleSeeCompanyModule,
  createCompanyModulesStore,
  isCompanyModuleEnabled,
  isSensitiveCompanyModuleSlug,
} from '@/lib/modules/company-modules';
import { applyMigration } from '@/lib/db/migrations/runner';
import { COMPANY_MODULE_SLUGS, type CompanyModuleSlug } from '@/types/modules';

const databases: Database.Database[] = [];
const migrationName = '060_company_modules.sql';
const migrationPath = path.join(
  process.cwd(),
  'src',
  'lib',
  'db',
  'migrations',
  migrationName,
);

function createDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  databases.push(db);
  db.exec(`
    CREATE TABLE companies (id TEXT PRIMARY KEY);
    CREATE TABLE users (id TEXT PRIMARY KEY);
    INSERT INTO companies (id) VALUES ('company-a'), ('company-b');
    INSERT INTO users (id) VALUES ('admin-a');
  `);
  applyMigration(db, migrationName, fs.readFileSync(migrationPath, 'utf8'));
  return db;
}

afterEach(() => {
  while (databases.length > 0) databases.pop()?.close();
});

describe('company modules store', () => {
  it('does not grant modules when rows are absent', () => {
    const db = createDatabase();
    const store = createCompanyModulesStore(db);

    expect(store.listCompanyModules('company-a')).toEqual([]);
    expect(store.getCompanyModule('company-a', 'nr1')).toBeNull();
  });

  it('creates the approved default module rows with sensitive modules locked or gated', () => {
    const db = createDatabase();
    const store = createCompanyModulesStore(db);
    const rows = store.ensureCompanyModules('company-a', '2026-07-22T18:00:00.000Z');
    const bySlug = Object.fromEntries(rows.map((row) => [row.module_slug, row]));
    const sensitive: CompanyModuleSlug[] = [
      'primary_health',
      'concierge',
      'nr1',
      'sipat',
      'human_development',
      'denunciation',
    ];

    expect(rows.map((row) => row.module_slug).sort()).toEqual([...COMPANY_MODULE_SLUGS].sort());
    for (const definition of COMPANY_MODULE_DEFINITIONS) {
      expect(bySlug[definition.slug]?.module_state).toBe(definition.defaultState);
      expect(Boolean(bySlug[definition.slug]?.visible)).toBe(definition.visibleByDefault);
    }
    for (const slug of sensitive) {
      expect(isCompanyModuleEnabled(bySlug[slug])).toBe(false);
    }
    expect(isCompanyModuleEnabled(bySlug.education)).toBe(true);
    expect(isCompanyModuleEnabled(bySlug.achievements)).toBe(true);
  });

  it('upserts company-scoped module state without crossing companies', () => {
    const db = createDatabase();
    const store = createCompanyModulesStore(db);
    const first = store.upsertCompanyModule({
      companyId: 'company-a',
      moduleSlug: 'sipat',
      moduleState: 'locked',
      now: '2026-07-22T18:00:00.000Z',
    });
    const second = store.upsertCompanyModule({
      companyId: 'company-a',
      moduleSlug: 'sipat',
      moduleState: 'requires_contract',
      visible: false,
      notes: 'Conteudo fonte pendente.',
      updatedBy: 'admin-a',
      now: '2026-07-22T19:00:00.000Z',
    });

    expect(second.id).toBe(first.id);
    expect(second.module_state).toBe('requires_contract');
    expect(second.visible).toBe(0);
    expect(second.notes).toBe('Conteudo fonte pendente.');
    expect(second.updated_by).toBe('admin-a');
    expect(second.updated_at).toBe('2026-07-22T19:00:00.000Z');
    expect(store.getCompanyModule('company-b', 'sipat')).toBeNull();
  });

  it('keeps role visibility typed but separate from access state', () => {
    expect(canRoleSeeCompanyModule('concierge', 'rh')).toBe(true);
    expect(canRoleSeeCompanyModule('concierge', 'colaboradora')).toBe(false);
    expect(canRoleSeeCompanyModule('sipat', 'colaboradora')).toBe(true);
    expect(canRoleSeeCompanyModule('nr1', 'lideranca')).toBe(false);
  });

  it('does not allow sensitive modules to be marked enabled by the admin module mutation', () => {
    expect(isSensitiveCompanyModuleSlug('nr1')).toBe(true);
    expect(isSensitiveCompanyModuleSlug('sipat')).toBe(true);
    expect(isSensitiveCompanyModuleSlug('concierge')).toBe(true);
    expect(isSensitiveCompanyModuleSlug('education')).toBe(false);

    expect(canAdminSetCompanyModuleState('nr1', 'enabled')).toBe(false);
    expect(canAdminSetCompanyModuleState('sipat', 'requires_contract')).toBe(true);
    expect(canAdminSetCompanyModuleState('denunciation', 'partner_managed')).toBe(true);
    expect(canAdminSetCompanyModuleState('education', 'enabled')).toBe(true);
  });
});
