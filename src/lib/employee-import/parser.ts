import { createHash } from 'node:crypto';
import {
  canonicalHeader,
  EMPLOYEE_IMPORT_HEADERS,
  normalizeDigits,
  normalizeOptionalText,
  type EmployeeImportHeader,
} from './contract';

export interface EmployeeImportParseOptions {
  companyId: string;
}

export interface EmployeeImportValidRow {
  rowNumber: number;
  companyName: string;
  fullName: string;
  motherName: string | null;
  cpfHash: string;
  cpfLast4: string;
  rg: string | null;
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
  email: string | null;
  errors: string[];
}

export interface EmployeeImportParseResult {
  totalRows: number;
  validRows: EmployeeImportValidRow[];
  errorRows: EmployeeImportErrorRow[];
}

type RawRow = Partial<Record<EmployeeImportHeader, string>>;

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

function hashCpf(companyId: string, cpfDigits: string): string {
  return createHash('sha256').update(`${companyId}:${cpfDigits}`).digest('hex');
}

function makeErrorRow(rowNumber: number, raw: RawRow, errors: string[]): EmployeeImportErrorRow {
  const cpfDigits = normalizeDigits(raw.CPF ?? '');
  return {
    rowNumber,
    cpfLast4: cpfDigits.length >= 4 ? cpfDigits.slice(-4) : null,
    email: normalizeOptionalText(raw['E-MAIL'])?.toLowerCase() ?? null,
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
  const email = normalizeOptionalText(raw['E-MAIL'])?.toLowerCase() ?? '';
  const birthDate = parseBirthDate(raw['DATA NASC.']);
  const uf = normalizeOptionalText(raw.UF)?.toUpperCase() ?? null;
  const ddd = normalizeDigits(raw.DDD ?? '');
  const phone = normalizeDigits(raw.TELEFONE ?? '');

  if (!companyName) errors.push('EMPRESA e obrigatorio');
  if (!fullName) errors.push('NOME COMPLETO e obrigatorio');
  if (cpfDigits.length !== 11) errors.push('CPF deve conter 11 digitos');
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
    cpfHash: hashCpf(options.companyId, cpfDigits),
    cpfLast4: cpfDigits.slice(-4),
    rg: normalizeOptionalText(raw.RG),
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
    return { totalRows: 0, validRows: [], errorRows: [{ rowNumber: 1, cpfLast4: null, email: null, errors: ['Arquivo vazio'] }] };
  }

  const headerMap = table[0].map((header) => canonicalHeader(header));
  const missingHeaders = EMPLOYEE_IMPORT_HEADERS.filter((expected) => !headerMap.includes(expected));
  if (missingHeaders.length > 0) {
    return {
      totalRows: Math.max(0, table.length - 1),
      validRows: [],
      errorRows: [{ rowNumber: 1, cpfLast4: null, email: null, errors: [`Colunas obrigatorias ausentes: ${missingHeaders.join(', ')}`] }],
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
    totalRows: table.length - 1,
    validRows,
    errorRows,
  };
}
