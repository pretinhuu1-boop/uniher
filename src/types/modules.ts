export const COMPANY_MODULE_SLUGS = [
  'primary_health',
  'concierge',
  'education',
  'achievements',
  'nr1',
  'sipat',
  'human_development',
  'denunciation',
] as const;

export type CompanyModuleSlug = (typeof COMPANY_MODULE_SLUGS)[number];

export const COMPANY_MODULE_STATES = [
  'enabled',
  'locked',
  'coming_soon',
  'partner_managed',
  'requires_contract',
] as const;

export type CompanyModuleState = (typeof COMPANY_MODULE_STATES)[number];

export type CompanyModuleRole = 'admin' | 'rh' | 'lideranca' | 'colaboradora';

export interface CompanyModuleRecord {
  id: string;
  company_id: string;
  module_slug: CompanyModuleSlug;
  module_state: CompanyModuleState;
  visible: 0 | 1;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export type CompanyModuleNavigationRecord = Pick<CompanyModuleRecord, 'module_slug' | 'module_state' | 'visible'>;

export interface CompanyModuleDefinition {
  slug: CompanyModuleSlug;
  label: string;
  defaultState: CompanyModuleState;
  visibleByDefault: boolean;
  visibleForRoles: readonly CompanyModuleRole[];
}

export const COMPANY_MODULE_DEFINITIONS: readonly CompanyModuleDefinition[] = [
  {
    slug: 'primary_health',
    label: 'Saude Primaria',
    defaultState: 'locked',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh', 'lideranca', 'colaboradora'],
  },
  {
    slug: 'concierge',
    label: 'Concierge',
    defaultState: 'requires_contract',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh'],
  },
  {
    slug: 'education',
    label: 'Educacao',
    defaultState: 'enabled',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh', 'lideranca', 'colaboradora'],
  },
  {
    slug: 'achievements',
    label: 'Conquistas',
    defaultState: 'enabled',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh', 'lideranca', 'colaboradora'],
  },
  {
    slug: 'nr1',
    label: 'NR-1',
    defaultState: 'requires_contract',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh', 'colaboradora'],
  },
  {
    slug: 'sipat',
    label: 'Viva SIPAT',
    defaultState: 'locked',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh', 'colaboradora'],
  },
  {
    slug: 'human_development',
    label: 'Desenvolvimento Humano',
    defaultState: 'requires_contract',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh', 'colaboradora'],
  },
  {
    slug: 'denunciation',
    label: 'Canal de Denuncias',
    defaultState: 'partner_managed',
    visibleByDefault: true,
    visibleForRoles: ['admin', 'rh', 'colaboradora'],
  },
];

export interface CompanyModuleUpsertInput {
  companyId: string;
  moduleSlug: CompanyModuleSlug;
  moduleState: CompanyModuleState;
  visible?: boolean;
  notes?: string | null;
  updatedBy?: string | null;
  now?: string;
}
