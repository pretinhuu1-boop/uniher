export const EMPLOYEE_IMPORT_HEADERS = [
  'EMPRESA',
  'NOME COMPLETO',
  'NOME MÃE',
  'CPF',
  'RG',
  'ÓRGÃO EMISSOR',
  'DATA NASC.',
  'SEXO',
  'ESTADO CIVIL',
  'PLANO DE SAÚDE',
  'CEP',
  'TIPO DE LOGRADOURO',
  'LOGRADOURO',
  'NUMERO',
  'COMPLEMENTO',
  'BAIRRO',
  'CIDADE',
  'UF',
  'E-MAIL',
  'DDD',
  'TELEFONE',
] as const;

export type EmployeeImportHeader = typeof EMPLOYEE_IMPORT_HEADERS[number];

export function makeEmployeeImportTemplateCsv(): string {
  return `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n`;
}

export function normalizeHeader(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

const headerAliasByNormalized = new Map<string, EmployeeImportHeader>(
  EMPLOYEE_IMPORT_HEADERS.flatMap((header) => {
    const aliases: Array<[string, EmployeeImportHeader]> = [[normalizeHeader(header), header]];
    if (header === 'ÓRGÃO EMISSOR') aliases.push([normalizeHeader('ORGÃO EMISSOR'), header], [normalizeHeader('ORGAO EMISSOR'), header]);
    if (header === 'NOME MÃE') aliases.push([normalizeHeader('NOME MAE'), header]);
    if (header === 'PLANO DE SAÚDE') aliases.push([normalizeHeader('PLANO DE SAUDE'), header]);
    if (header === 'DATA NASC.') aliases.push([normalizeHeader('DATA NASC'), header], [normalizeHeader('DATA DE NASCIMENTO'), header]);
    if (header === 'E-MAIL') aliases.push([normalizeHeader('EMAIL'), header]);
    if (header === 'NUMERO') aliases.push([normalizeHeader('NÚMERO'), header]);
    return aliases;
  }),
);

export function canonicalHeader(value: string): EmployeeImportHeader | null {
  return headerAliasByNormalized.get(normalizeHeader(value)) ?? null;
}

export function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}
