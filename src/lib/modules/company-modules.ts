import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import {
  COMPANY_MODULE_DEFINITIONS,
  COMPANY_MODULE_SLUGS,
  COMPANY_MODULE_STATES,
  type CompanyModuleDefinition,
  type CompanyModuleNavigationRecord,
  type CompanyModuleRecord,
  type CompanyModuleRole,
  type CompanyModuleSlug,
  type CompanyModuleState,
  type CompanyModuleUpsertInput,
} from '@/types/modules';

export { COMPANY_MODULE_DEFINITIONS };

const moduleSlugs = new Set<CompanyModuleSlug>(COMPANY_MODULE_SLUGS);
const moduleStates = new Set<CompanyModuleState>(COMPANY_MODULE_STATES);
const sensitiveModuleSlugs = new Set<CompanyModuleSlug>([
  'primary_health',
  'concierge',
  'nr1',
  'sipat',
  'human_development',
  'denunciation',
]);

export function isCompanyModuleSlug(value: string): value is CompanyModuleSlug {
  return moduleSlugs.has(value as CompanyModuleSlug);
}

export function isCompanyModuleState(value: string): value is CompanyModuleState {
  return moduleStates.has(value as CompanyModuleState);
}

export function isSensitiveCompanyModuleSlug(value: CompanyModuleSlug): boolean {
  return sensitiveModuleSlugs.has(value);
}

export function canAdminSetCompanyModuleState(
  moduleSlug: CompanyModuleSlug,
  moduleState: CompanyModuleState,
): boolean {
  return moduleState !== 'enabled' || !isSensitiveCompanyModuleSlug(moduleSlug);
}

export function getCompanyModuleDefinition(slug: CompanyModuleSlug): CompanyModuleDefinition {
  const definition = COMPANY_MODULE_DEFINITIONS.find((item) => item.slug === slug);
  if (!definition) throw new Error(`Unknown company module slug: ${slug}`);
  return definition;
}

export function canRoleSeeCompanyModule(slug: CompanyModuleSlug, role: CompanyModuleRole): boolean {
  return getCompanyModuleDefinition(slug).visibleForRoles.includes(role);
}

export function isCompanyModuleEnabled(module: Pick<CompanyModuleRecord, 'module_state' | 'visible'>): boolean {
  return module.visible === 1 && module.module_state === 'enabled';
}

export function resolveCompanyModuleNavigationRows(
  companyModules: readonly Pick<CompanyModuleRecord, 'module_slug' | 'module_state' | 'visible'>[],
): CompanyModuleNavigationRecord[] {
  const explicitRows = new Map(companyModules.map((module) => [module.module_slug, module]));

  return COMPANY_MODULE_DEFINITIONS.map((definition) => {
    const explicit = explicitRows.get(definition.slug);

    return {
      module_slug: definition.slug,
      module_state: explicit?.module_state ?? definition.defaultState,
      visible: explicit?.visible ?? (definition.visibleByDefault ? 1 : 0),
    };
  });
}

function assertCompanyModuleInput(input: CompanyModuleUpsertInput): void {
  if (!isCompanyModuleSlug(input.moduleSlug)) {
    throw new Error(`Invalid company module slug: ${input.moduleSlug}`);
  }
  if (!isCompanyModuleState(input.moduleState)) {
    throw new Error(`Invalid company module state: ${input.moduleState}`);
  }
}

function toRecord(row: CompanyModuleRecord): CompanyModuleRecord {
  if (!isCompanyModuleSlug(row.module_slug)) {
    throw new Error(`Database returned invalid company module slug: ${row.module_slug}`);
  }
  if (!isCompanyModuleState(row.module_state)) {
    throw new Error(`Database returned invalid company module state: ${row.module_state}`);
  }
  return row;
}

export function createCompanyModulesStore(database: Database.Database) {
  function listCompanyModules(companyId: string): CompanyModuleRecord[] {
    return (database.prepare(`
        SELECT *
        FROM company_modules
        WHERE company_id = ?
        ORDER BY module_slug ASC
      `).all(companyId) as CompanyModuleRecord[]).map(toRecord);
  }

  function getCompanyModule(companyId: string, moduleSlug: CompanyModuleSlug): CompanyModuleRecord | null {
    const row = database.prepare(`
        SELECT *
        FROM company_modules
        WHERE company_id = @companyId
          AND module_slug = @moduleSlug
      `).get({ companyId, moduleSlug }) as CompanyModuleRecord | undefined;
    return row ? toRecord(row) : null;
  }

  function upsertCompanyModule(input: CompanyModuleUpsertInput): CompanyModuleRecord {
    assertCompanyModuleInput(input);
    const now = input.now ?? new Date().toISOString();
    const values = {
      id: nanoid(),
      companyId: input.companyId,
      moduleSlug: input.moduleSlug,
      moduleState: input.moduleState,
      visible: input.visible === false ? 0 : 1,
      notes: input.notes ?? null,
      updatedBy: input.updatedBy ?? null,
      now,
    };

    database.prepare(`
        INSERT INTO company_modules (
          id, company_id, module_slug, module_state, visible,
          notes, created_at, updated_at, updated_by
        ) VALUES (
          @id, @companyId, @moduleSlug, @moduleState, @visible,
          @notes, @now, @now, @updatedBy
        )
        ON CONFLICT(company_id, module_slug) DO UPDATE SET
          module_state = excluded.module_state,
          visible = excluded.visible,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).run(values);

    const row = getCompanyModule(input.companyId, input.moduleSlug);
    if (!row) throw new Error('Company module was not persisted');
    return row;
  }

  function ensureCompanyModules(companyId: string, now = new Date().toISOString()): CompanyModuleRecord[] {
    const ensure = database.transaction(() => {
      for (const definition of COMPANY_MODULE_DEFINITIONS) {
        upsertCompanyModule({
          companyId,
          moduleSlug: definition.slug,
          moduleState: definition.defaultState,
          visible: definition.visibleByDefault,
          now,
        });
      }
    });
    ensure.immediate();
    return listCompanyModules(companyId);
  }

  return {
    listCompanyModules,
    getCompanyModule,
    upsertCompanyModule,
    ensureCompanyModules,
  };
}
