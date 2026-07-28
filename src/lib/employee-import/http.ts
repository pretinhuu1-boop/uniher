export const MAX_EMPLOYEE_IMPORT_CSV_BYTES = 2_000_000;

export interface EmployeeImportCsvBody {
  csv: string;
  filename: string | null;
}

export function sanitizeEmployeeImportFilename(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  const sanitized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/]/g, '')
    .replace(/\.\.+/g, '')
    .replace(/[\x00-\x1F\x7F<>:"|?*]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!sanitized) return null;
  if (sanitized.length <= 255) return sanitized;
  if (sanitized.toLowerCase().endsWith('.csv')) {
    return `${sanitized.slice(0, 251)}.csv`;
  }
  return sanitized.slice(0, 255);
}

function normalizeCsvFilename(value: string | null | undefined): { ok: true; filename: string | null } | { ok: false; status: number; error: string } {
  const filename = sanitizeEmployeeImportFilename(value);
  if (filename && !filename.toLowerCase().endsWith('.csv')) {
    return { ok: false, status: 422, error: 'Arquivo deve ter extensao .csv.' };
  }
  return { ok: true, filename };
}

export async function readEmployeeImportCsvBody(
  req: Request,
): Promise<{ ok: true; body: EmployeeImportCsvBody } | { ok: false; status: number; error: string }> {
  const contentLength = Number(req.headers.get('content-length') || '0');
  if (contentLength > MAX_EMPLOYEE_IMPORT_CSV_BYTES) {
    return { ok: false, status: 413, error: 'Arquivo muito grande. Limite: 2MB.' };
  }

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return { ok: false, status: 422, error: 'Arquivo CSV nao encontrado.' };
    }
    if (file.size > MAX_EMPLOYEE_IMPORT_CSV_BYTES) {
      return { ok: false, status: 413, error: 'Arquivo muito grande. Limite: 2MB.' };
    }
    const filename = normalizeCsvFilename(file.name);
    if (!filename.ok) return filename;
    const csv = await file.text();
    if (!csv.trim()) {
      return { ok: false, status: 422, error: 'Arquivo CSV vazio.' };
    }
    return { ok: true, body: { csv, filename: filename.filename } };
  }

  if (contentType.includes('application/json')) {
    const payload = await req.json().catch(() => null) as { csv?: unknown; filename?: unknown } | null;
    if (!payload || typeof payload.csv !== 'string') {
      return { ok: false, status: 422, error: 'CSV nao informado.' };
    }
    if (Buffer.byteLength(payload.csv, 'utf8') > MAX_EMPLOYEE_IMPORT_CSV_BYTES) {
      return { ok: false, status: 413, error: 'Arquivo muito grande. Limite: 2MB.' };
    }
    if (!payload.csv.trim()) {
      return { ok: false, status: 422, error: 'Arquivo CSV vazio.' };
    }
    const filename = normalizeCsvFilename(typeof payload.filename === 'string' ? payload.filename : null);
    if (!filename.ok) return filename;
    return {
      ok: true,
      body: {
        csv: payload.csv,
        filename: filename.filename,
      },
    };
  }

  const csv = await req.text();
  if (Buffer.byteLength(csv, 'utf8') > MAX_EMPLOYEE_IMPORT_CSV_BYTES) {
    return { ok: false, status: 413, error: 'Arquivo muito grande. Limite: 2MB.' };
  }
  if (!csv.trim()) {
    return { ok: false, status: 422, error: 'Arquivo CSV vazio.' };
  }
  return { ok: true, body: { csv, filename: null } };
}

export function getRequestIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || undefined;
}
