import { createHmac } from 'node:crypto';
import {
  canonicalHeader,
  EMPLOYEE_IMPORT_HEADERS,
  normalizeDigits,
  normalizeOptionalText,
  type EmployeeImportHeader,
} from './contract';

export interface EmployeeImportParseOptions {
  companyId: string;
  expectedCompanyName?: string;
  maxRows?: number;
}

export interface EmployeeImportValidRow {
  rowNumber: number;
  companyName: string;
  fullName: string;
  motherName: string | null;
  cpfHash: string;
  cpfLast4: string;
  rgHash: string | null;
  rgLast4: string | null;
  rgIssuer: string | null;
  birthDate: string | null;
  sex: string | null;
  maritalStatus: string | null;
  healthPlan: string | null;
  cep: string | null;
  streetType: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  uf: string | null;
  email: string;
  ddd: string | null;
  phone: string | null;
}

export interface EmployeeImportErrorRow {
  rowNumber: number;
  cpfLast4: string | null;
  emailPreview: string | null;
  errors: string[];
}

export interface EmployeeImportParseResult {
  totalRows: number;
  validRows: EmployeeImportValidRow[];
  errorRows: EmployeeImportErrorRow[];
}

export interface EmployeeImportPreviewRow {
  rowNumber: number;
  companyName: string;
  fullNamePreview: string;
  cpfLast4: string;
  rgLast4: string | null;
  emailPreview: string;
}

type RawRow = Partial<Record<EmployeeImportHeader, string>>;

export const MAX_EMPLOYEE_IMPORT_ROWS = 1000;

function detectDelimiter(headerLine: string): ',' | ';' {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  return semicolonCount > commaCount ? ';' : ',';
}

function parseCsvLine(line: string, delimiter: ',' | ';'): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function splitCsv(content: string): string[][] {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const delimiter = detectDelimiter(lines[0]);
  return lines.map((line) => parseCsvLine(line, delimiter));
}

function parseBirthDate(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month}-${day}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  return iso ? trimmed : null;
}

const DEV_ONLY_PII_HMAC_SECRET = 'dev-only-employee-import-pii-hmac-secret-please-set-env-in-production';

function getPiiHmacSecret(): string {
  const secret = process.env.UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET
    || process.env.EMPLOYEE_IMPORT_PII_HMAC_SECRET
    || '';
  if (secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new Error('UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET must be set with at least 32 characters');
  }
  return DEV_ONLY_PII_HMAC_SECRET;
}

function hmacIdentifier(companyId: string, kind: 'cpf' | 'rg', value: string): string {
  return createHmac('sha256', getPiiHmacSecret())
    .update(`${kind}:${companyId}:${value}`)
    .digest('hex');
}

function validateCpf(cpfDigits: string): boolean {
  if (!/^\d{11}$/.test(cpfDigits)) return false;
  if (/^(\d)\1{10}$/.test(cpfDigits)) return false;

  const digits = cpfDigits.split('').map(Number);
  const firstSum = digits.slice(0, 9).reduce((sum, digit, index) => sum + digit * (10 - index), 0);
  const firstCheck = (firstSum * 10) % 11;
  const expectedFirst = firstCheck === 10 ? 0 : firstCheck;
  if (digits[9] !== expectedFirst) return false;

  const secondSum = digits.slice(0, 10).reduce((sum, digit, index) => sum + digit * (11 - index), 0);
  const secondCheck = (secondSum * 10) % 11;
  const expectedSecond = secondCheck === 10 ? 0 : secondCheck;
  return digits[10] === expectedSecond;
}

function normalizeRg(value: string | undefined): string {
  return (value ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeComparableText(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function maskEmail(value: string | null): string | null {
  if (!value) return null;
  const [local] = value.split('@');
  const first = local?.trim().charAt(0).toLowerCase();
  return first ? `${first}***@***` : null;
}

function maskName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}***`)
    .join(' ');
}

export function toEmployeeImportPreviewRow(row: EmployeeImportValidRow): EmployeeImportPreviewRow {
  return {
    rowNumber: row.rowNumber,
    companyName: row.companyName,
    fullNamePreview: maskName(row.fullName),
    cpfLast4: row.cpfLast4,
    rgLast4: row.rgLast4,
    emailPreview: maskEmail(row.email) ?? '',
  };
}

function makeErrorRow(rowNumber: number, raw: RawRow, errors: string[]): EmployeeImportErrorRow {
  const cpfDigits = normalizeDigits(raw.CPF ?? '');
  return {
    rowNumber,
    cpfLast4: cpfDigits.length >= 4 ? cpfDigits.slice(-4) : null,
    emailPreview: maskEmail(normalizeOptionalText(raw['E-MAIL'])?.toLowerCase() ?? null),
    errors,
  };
}

function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapRow(rowNumber: number, raw: RawRow, options: EmployeeImportParseOptions): EmployeeImportValidRow | EmployeeImportErrorRow {
  const errors: string[] = [];
  const companyName = normalizeOptionalText(raw.EMPRESA);
  const fullName = normalizeOptionalText(raw['NOME COMPLETO']);
  const cpfDigits = normalizeDigits(raw.CPF ?? '');
  const rgIdentifier = normalizeRg(raw.RG);
  const email = normalizeOptionalText(raw['E-MAIL'])?.toLowerCase() ?? '';
  const birthDate = parseBirthDate(raw['DATA NASC.']);
  const uf = normalizeOptionalText(raw.UF)?.toUpperCase() ?? null;
  const ddd = normalizeDigits(raw.DDD ?? '');
  const phone = normalizeDigits(raw.TELEFONE ?? '');

  if (!companyName) errors.push('EMPRESA e obrigatorio');
  else if (
    options.expectedCompanyName
    && normalizeComparableText(companyName) !== normalizeComparableText(options.expectedCompanyName)
  ) {
    errors.push('EMPRESA nao corresponde a empresa autenticada');
  }
  if (!fullName) errors.push('NOME COMPLETO e obrigatorio');
  if (cpfDigits.length !== 11) errors.push('CPF deve conter 11 digitos');
  else if (!validateCpf(cpfDigits)) errors.push('CPF invalido');
  if (!email) errors.push('E-MAIL e obrigatorio');
  if (email && !validateEmail(email)) errors.push('E-MAIL invalido');
  if ((raw['DATA NASC.'] ?? '').trim() && !birthDate) errors.push('DATA NASC. deve usar DD/MM/AAAA');
  if (uf && !/^[A-Z]{2}$/.test(uf)) errors.push('UF deve conter 2 letras');
  if (ddd && ddd.length !== 2) errors.push('DDD deve conter 2 digitos');

  if (errors.length > 0) return makeErrorRow(rowNumber, raw, errors);

  return {
    rowNumber,
    companyName: companyName!,
    fullName: fullName!,
    motherName: normalizeOptionalText(raw['NOME MÃE']),
    cpfHash: hmacIdentifier(options.companyId, 'cpf', cpfDigits),
    cpfLast4: cpfDigits.slice(-4),
    rgHash: rgIdentifier ? hmacIdentifier(options.companyId, 'rg', rgIdentifier) : null,
    rgLast4: rgIdentifier ? rgIdentifier.slice(-4) : null,
    rgIssuer: normalizeOptionalText(raw['ÓRGÃO EMISSOR']),
    birthDate,
    sex: normalizeOptionalText(raw.SEXO)?.toUpperCase() ?? null,
    maritalStatus: normalizeOptionalText(raw['ESTADO CIVIL']),
    healthPlan: normalizeOptionalText(raw['PLANO DE SAÚDE']),
    cep: normalizeDigits(raw.CEP ?? '') || null,
    streetType: normalizeOptionalText(raw['TIPO DE LOGRADOURO']),
    street: normalizeOptionalText(raw.LOGRADOURO),
    number: normalizeOptionalText(raw.NUMERO),
    complement: normalizeOptionalText(raw.COMPLEMENTO),
    neighborhood: normalizeOptionalText(raw.BAIRRO),
    city: normalizeOptionalText(raw.CIDADE),
    uf,
    email,
    ddd: ddd || null,
    phone: phone || null,
  };
}

export function parseEmployeeImportCsv(content: string, options: EmployeeImportParseOptions): EmployeeImportParseResult {
  const table = splitCsv(content);
  if (table.length === 0) {
    return { totalRows: 0, validRows: [], errorRows: [{ rowNumber: 1, cpfLast4: null, emailPreview: null, errors: ['Arquivo vazio'] }] };
  }

  const headerMap = table[0].map((header) => canonicalHeader(header));
  const missingHeaders = EMPLOYEE_IMPORT_HEADERS.filter((expected) => !headerMap.includes(expected));
  if (missingHeaders.length > 0) {
    return {
      totalRows: Math.max(0, table.length - 1),
      validRows: [],
      errorRows: [{ rowNumber: 1, cpfLast4: null, emailPreview: null, errors: [`Colunas obrigatorias ausentes: ${missingHeaders.join(', ')}`] }],
    };
  }

  const totalRows = table.length - 1;
  const maxRows = options.maxRows ?? MAX_EMPLOYEE_IMPORT_ROWS;
  if (totalRows > maxRows) {
    return {
      totalRows,
      validRows: [],
      errorRows: [{
        rowNumber: 1,
        cpfLast4: null,
        emailPreview: null,
        errors: [`Limite de ${maxRows} linhas excedido`],
      }],
    };
  }

  const validRows: EmployeeImportValidRow[] = [];
  const errorRows: EmployeeImportErrorRow[] = [];

  for (let index = 1; index < table.length; index += 1) {
    const raw: RawRow = {};
    table[index].forEach((value, columnIndex) => {
      const header = headerMap[columnIndex];
      if (header) raw[header] = value;
    });
    const mapped = mapRow(index + 1, raw, options);
    if ('errors' in mapped) errorRows.push(mapped);
    else validRows.push(mapped);
  }

  return {
    totalRows,
    validRows,
    errorRows,
  };
}
