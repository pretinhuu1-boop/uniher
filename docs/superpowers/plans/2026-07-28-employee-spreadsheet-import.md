# Employee Spreadsheet Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure operational import flow for company collaborator spreadsheets using the approved UniHER employee data columns.

**Architecture:** Keep employee identity data separate from login accounts: `users` remains the auth/account table, while `employee_identity_profiles` stores sensitive administrative identity fields scoped by `company_id`. The RH/Admin UI imports through a preview/commit flow, never exposing CPF/RG/address in leadership views, gamification, Semaforo, or community projections.

**Tech Stack:** Next.js route handlers, SQLite/better-sqlite3 migrations, WriteQueue, zod validation, Vitest, CSV V1 without adding XLSX dependency.

---

## Source Of Truth

Approved V1 headers:

```csv
EMPRESA,NOME COMPLETO,NOME MÃE,CPF,RG,ÓRGÃO EMISSOR,DATA NASC.,SEXO,ESTADO CIVIL,PLANO DE SAÚDE,CEP,TIPO DE LOGRADOURO,LOGRADOURO,NUMERO,COMPLEMENTO,BAIRRO,CIDADE,UF,E-MAIL,DDD,TELEFONE
```

## File Structure

- Create: `src/lib/employee-import/contract.ts`
  - Header contract, aliases, template generation, normalization helpers.
- Create: `src/lib/employee-import/parser.ts`
  - CSV parser, delimiter detection, row validation, safe preview model.
- Create: `src/lib/db/migrations/065_employee_identity_imports.sql`
  - `employee_identity_profiles` and `employee_import_batches`.
- Create: `src/app/api/rh/employees/import-template/route.ts`
  - RH/admin company-scoped CSV template download.
- Create: `src/app/api/rh/employees/import-preview/route.ts`
  - RH/admin company-scoped CSV preview without persistence.
- Later create: `src/app/api/rh/employees/import-commit/route.ts`
  - Commit validated rows through WriteQueue and sanitized audit.
- Modify: `src/app/(platform)/colaboradoras-gestao/page.tsx`
  - Add `Importar planilha` and `Baixar modelo` controls.
- Modify: `src/app/(platform)/onboarding-rh/page.tsx`
  - Send collaborator setup to `/colaboradoras-gestao`.
- Test: `tests/unit/employee-import.test.ts`
  - Contract, parser, validation, migration, and no sensitive audit payload.

## Task 1: Contract, Parser, And Migration Foundation

**Files:**
- Create: `tests/unit/employee-import.test.ts`
- Create: `src/lib/employee-import/contract.ts`
- Create: `src/lib/employee-import/parser.ts`
- Create: `src/lib/db/migrations/065_employee_identity_imports.sql`

- [ ] **Step 1: Write failing tests**

```ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import {
  EMPLOYEE_IMPORT_HEADERS,
  makeEmployeeImportTemplateCsv,
} from '@/lib/employee-import/contract';
import { parseEmployeeImportCsv } from '@/lib/employee-import/parser';

describe('employee spreadsheet import foundation', () => {
  it('generates the approved CSV header exactly once', () => {
    expect(makeEmployeeImportTemplateCsv().split(/\r?\n/)[0]).toBe(EMPLOYEE_IMPORT_HEADERS.join(','));
  });

  it('parses approved rows and normalizes sensitive identifiers for safe preview', () => {
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n` +
      'Eduarda Eyuri Marketing LTDA,Ana Silva,Maria Silva,123.456.789-09,12.345.678-9,SSP,15/03/1990,F,Solteira,Unimed,01001-000,Rua,Boa Vista,100,Apto 2,Centro,Sao Paulo,sp,ana@example.com,11,99999-0000';

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a' });

    expect(result.validRows).toHaveLength(1);
    expect(result.errorRows).toHaveLength(0);
    expect(result.validRows[0]).toMatchObject({
      rowNumber: 2,
      fullName: 'Ana Silva',
      cpfLast4: '8909',
      cpfHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      birthDate: '1990-03-15',
      uf: 'SP',
      email: 'ana@example.com',
      ddd: '11',
      phone: '999990000',
    });
    expect(JSON.stringify(result.validRows[0])).not.toContain('123.456.789-09');
  });

  it('rejects missing required fields without echoing raw CPF', () => {
    const csv = `${EMPLOYEE_IMPORT_HEADERS.join(',')}\n` +
      'Empresa Teste,,Mae,123.456.789-09,,,,,,,,,,,,,,,,,';

    const result = parseEmployeeImportCsv(csv, { companyId: 'company-a' });

    expect(result.validRows).toHaveLength(0);
    expect(result.errorRows[0].errors).toContain('NOME COMPLETO e obrigatorio');
    expect(JSON.stringify(result.errorRows[0])).not.toContain('123.456.789-09');
  });

  it('creates isolated profile and batch tables with company scoped CPF hash uniqueness', () => {
    const db = new Database(':memory:');
    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', '065_employee_identity_imports.sql');
    expect(applyMigration(db, '065_employee_identity_imports.sql', fs.readFileSync(migrationPath, 'utf8'))).toBe('applied');
    expect(applyMigration(db, '065_employee_identity_imports.sql', fs.readFileSync(migrationPath, 'utf8'))).toBe('skipped');

    db.prepare("INSERT INTO employee_identity_profiles (id, company_id, full_name, cpf_hash, cpf_last4, email) VALUES ('a1', 'company-a', 'Ana', 'hash-a', '8909', 'ana@example.com')").run();
    db.prepare("INSERT INTO employee_identity_profiles (id, company_id, full_name, cpf_hash, cpf_last4, email) VALUES ('b1', 'company-b', 'Ana', 'hash-a', '8909', 'ana@example.com')").run();
    expect(() => db.prepare("INSERT INTO employee_identity_profiles (id, company_id, full_name, cpf_hash, cpf_last4, email) VALUES ('a2', 'company-a', 'Ana 2', 'hash-a', '8909', 'ana2@example.com')").run()).toThrow();
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts
```

Expected: fail because `@/lib/employee-import/contract` does not exist.

- [ ] **Step 3: Implement minimal contract/parser/migration**

Create the files listed above. The parser must return safe preview rows with `cpfHash` and `cpfLast4`, not raw CPF.

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts
```

Expected: all tests pass.

## Task 2: RH Preview API

**Files:**
- Create: `src/app/api/rh/employees/import-template/route.ts`
- Create: `src/app/api/rh/employees/import-preview/route.ts`
- Test: `tests/unit/employee-import-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Test RH only, persisted actor company validation, template content type, preview rejects collaborator/leader, and preview never echoes raw CPF.

- [ ] **Step 2: Implement template and preview routes**

Use `withRole('rh', 'admin')`, re-read actor from `users` with `id`, `company_id`, persisted `role`, `deleted_at IS NULL`, `blocked=0`, `approved=1`. Parse `text/csv` or multipart file content into `parseEmployeeImportCsv`.

- [ ] **Step 3: Run focused API tests**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts
```

Expected: all tests pass.

## Task 3: Commit API And Audit

**Files:**
- Create: `src/app/api/rh/employees/import-commit/route.ts`
- Create: `src/lib/employee-import/repository.ts`
- Modify: `src/lib/audit.ts`
- Test: `tests/unit/employee-import-api.test.ts`

- [ ] **Step 1: Write failing commit tests**

Cover valid commit, duplicate same-company CPF rejection/upsert, cross-company CPF allowed, department/company mismatch rejection, and sanitized audit details.

- [ ] **Step 2: Implement repository and commit route**

Persist through WriteQueue. Audit action should store only batch counts, file hash, and status, never CPF, RG, phone, address, or raw row JSON.

- [ ] **Step 3: Run focused commit tests**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts
```

Expected: all tests pass.

## Task 4: UI Entry Points

**Files:**
- Modify: `src/app/(platform)/colaboradoras-gestao/page.tsx`
- Modify: `src/app/(platform)/onboarding-rh/page.tsx`
- Modify: `src/app/(platform)/convites/page.tsx`
- Test: add or extend focused UI tests if existing harness supports it.

- [ ] **Step 1: Add failing source-contract tests**

Assert `colaboradoras-gestao` contains `Importar planilha` and calls RH import endpoints; assert onboarding points collaborator setup to `/colaboradoras-gestao`.

- [ ] **Step 2: Implement UI controls**

Place `Importar planilha` and `Baixar modelo` in the collaborator management header and empty state. Keep `Convites` as manual invite surface.

- [ ] **Step 3: Run UI/source tests and visual smoke when viable**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts
npm run test:rh
```

Expected: focused import tests pass; RH smoke still passes or any visual gap is documented.

## Governance Gates

- `npx vitest run tests/unit/employee-import.test.ts`
- Import API focused tests once Task 2 starts.
- `npx vitest run tests/unit/tenant-api-hardening.test.ts tests/unit/privacy/gamification-safe-projection.test.ts`
- `npx tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "CPF|RG|TELEFONE|LOGRADOURO|cpf|rg|phone|address" src/app/api src/lib tests/unit/employee-import*` before closeout to inspect sensitive exposures.

## Release Rule

Do not enable XLSX upload in V1 unless a parser dependency is explicitly approved and audited. CSV is operational first because the repo has no XLSX dependency today.
