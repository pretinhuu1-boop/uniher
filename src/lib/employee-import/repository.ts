import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { EmployeeImportValidRow } from './parser';

export interface CommitEmployeeImportInput {
  companyId: string;
  actorId: string;
  filename: string | null;
  csv: string;
  rows: EmployeeImportValidRow[];
}

export interface CommitEmployeeImportResult {
  batchId: string;
  fileSha256: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  insertedRows: number;
  updatedRows: number;
}

export function commitEmployeeImport(
  db: Database.Database,
  input: CommitEmployeeImportInput,
): CommitEmployeeImportResult {
  const batchId = nanoid();
  const fileSha256 = createHash('sha256').update(input.csv).digest('hex');

  return db.transaction(() => {
    const existingHashes = new Set(
      db.prepare(`
        SELECT cpf_hash
        FROM employee_identity_profiles
        WHERE company_id = ?
          AND cpf_hash IN (${input.rows.map(() => '?').join(',')})
      `).all(input.companyId, ...input.rows.map((row) => row.cpfHash))
        .map((row) => (row as { cpf_hash: string }).cpf_hash),
    );

    const upsertProfile = db.prepare(`
      INSERT INTO employee_identity_profiles (
        id, company_id, full_name, mother_name, cpf_hash, cpf_last4,
        rg_hash, rg_last4, rg_issuer, birth_date, sex, marital_status,
        health_plan, cep, street_type, street, number, complement,
        neighborhood, city, uf, email, ddd, phone, imported_by, deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(company_id, cpf_hash) DO UPDATE SET
        full_name = excluded.full_name,
        mother_name = excluded.mother_name,
        rg_hash = excluded.rg_hash,
        rg_last4 = excluded.rg_last4,
        rg_issuer = excluded.rg_issuer,
        birth_date = excluded.birth_date,
        sex = excluded.sex,
        marital_status = excluded.marital_status,
        health_plan = excluded.health_plan,
        cep = excluded.cep,
        street_type = excluded.street_type,
        street = excluded.street,
        number = excluded.number,
        complement = excluded.complement,
        neighborhood = excluded.neighborhood,
        city = excluded.city,
        uf = excluded.uf,
        email = excluded.email,
        ddd = excluded.ddd,
        phone = excluded.phone,
        imported_by = excluded.imported_by,
        deleted_at = NULL,
        updated_at = datetime('now')
    `);

    let insertedRows = 0;
    let updatedRows = 0;

    for (const row of input.rows) {
      if (existingHashes.has(row.cpfHash)) updatedRows += 1;
      else insertedRows += 1;

      upsertProfile.run(
        nanoid(),
        input.companyId,
        row.fullName,
        row.motherName,
        row.cpfHash,
        row.cpfLast4,
        row.rgHash,
        row.rgLast4,
        row.rgIssuer,
        row.birthDate,
        row.sex,
        row.maritalStatus,
        row.healthPlan,
        row.cep,
        row.streetType,
        row.street,
        row.number,
        row.complement,
        row.neighborhood,
        row.city,
        row.uf,
        row.email,
        row.ddd,
        row.phone,
        input.actorId,
      );
    }

    db.prepare(`
      INSERT INTO employee_import_batches (
        id, company_id, filename, file_sha256, status,
        total_rows, valid_rows, error_rows, created_by, committed_at
      )
      VALUES (?, ?, ?, ?, 'committed', ?, ?, 0, ?, datetime('now'))
    `).run(
      batchId,
      input.companyId,
      input.filename,
      fileSha256,
      input.rows.length,
      input.rows.length,
      input.actorId,
    );

    return {
      batchId,
      fileSha256,
      totalRows: input.rows.length,
      validRows: input.rows.length,
      errorRows: 0,
      insertedRows,
      updatedRows,
    };
  })();
}
