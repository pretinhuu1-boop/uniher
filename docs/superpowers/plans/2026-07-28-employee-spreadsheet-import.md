# Employee Spreadsheet Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a secure operational import flow for company collaborator spreadsheets using the approved UniHER employee data columns.

**Architecture:** Keep employee identity data separate from login accounts: `users` remains the auth/account table, while `employee_identity_profiles` stores sensitive administrative identity fields scoped by `company_id`. The RH/Admin UI imports through a preview/commit flow, never exposing CPF/RG/address in leadership views, gamification, Semaforo, or community projections.

**Tech Stack:** Next.js route handlers, SQLite/better-sqlite3 migrations, WriteQueue, zod validation, Vitest, CSV V1 without adding XLSX dependency.

---

## Goal Control Plane

**Active goal:** Implementar completamente a importacao segura de planilhas de colaboradoras UniHER, com waves documentadas, guardrails de seguranca/LGPD, revisao do Claude a cada wave, evidencias de testes e screenshot final da implementacao completa.

**Coordinator:** Codex in `C:\Users\user\Documents\uniher-app-audit\.worktrees\uniher-wave3-collaborator-nr1`.

**Current baseline:** `f97218d feat: add employee spreadsheet import foundation`.

**Implementation policy:**
- TDD first for every behavior-changing wave.
- Local commits after each closed wave.
- No push, no deploy, no production mutation unless explicitly approved.
- Claude Code review after each wave before the wave is accepted as PASS.
- Screenshot evidence only after the UI is complete and running.

**Write allowlist:**
- `docs/superpowers/plans/2026-07-28-employee-spreadsheet-import.md`
- `docs/superpowers/audits/*employee*import*.md`
- `docs/superpowers/evidence/*employee*import*`
- `src/lib/employee-import/**`
- `src/lib/db/migrations/065_employee_identity_imports.sql`
- `src/app/api/rh/employees/**`
- `src/app/(platform)/colaboradoras-gestao/page.tsx`
- `src/app/(platform)/onboarding-rh/page.tsx`
- `src/app/(platform)/convites/page.tsx`
- focused unit/e2e tests for employee import, RH UI, tenant/privacy guardrails

**Write denylist:**
- Semaforo implementation and storage.
- NR-1/Yavix runtime, provisioning, scoring, or mock contract changes.
- Liga, ranking, XP, badges, achievements, or legacy gamification behavior.
- Public landing, auth refresh, sidebar visual redesign, campaign join, P8.
- Production deploy, database mutation on live VPS, push, merge, rebase.
- Any audit/log payload that includes raw CPF, RG, phone, full address, plan, mother name, or raw spreadsheet rows.

**Security guardrails:**
- Persisted actor must be re-read from `users` with `id`, `company_id`, `role`, active/approved/not blocked/not deleted checks.
- RH/admin company users can only import into their own `company_id`.
- Master Admin can import for a selected company only through an explicit admin-scoped route or explicit `companyId`; not through RH session inference.
- CPF must be normalized and stored as `cpf_hash` plus `cpf_last4`; raw CPF must not appear in preview JSON, logs, audit details, screenshots, or generic user projections.
- Leadership routes must not query or project `employee_identity_profiles`.
- DSAR must include the collaborator's own identity profile before production release.
- CSV upload is V1. XLSX is HOLD until a parser dependency and file validation policy are approved.

**Claude review protocol after every wave:**

```powershell
claude -p "Review the current UniHER employee spreadsheet import wave. Focus on tenant isolation, PII exposure, audit/log leakage, route authorization, tests, and scope drift. Do not edit files. Return findings ordered by severity with file paths and line references when possible."
```

The wave can pass only when Claude returns no High/Critical unresolved finding, or when a finding is fixed and re-reviewed.

## Wave Map

| Wave | Status | Deliverable | Required gate | Claude review |
| --- | --- | --- | --- | --- |
| 0 | In progress | Goal harness, full wave plan, guardrails | Plan updated, worktree clean except intentional plan diff | Required before next code wave |
| 1 | PASS, commit `f97218d` | Contract, parser, migration foundation | RED/GREEN, 31 focused tests, typecheck, diff check | Needs retrospective Claude review under this goal |
| 1.1 | PASS | Claude Medium hardening fixes: HMAC secret, CPF validation, RG hash, soft delete/restrict | employee import + tenant/gamification focused tests, typecheck, diff check | PASS, no High/Critical/Medium |
| 2 | Pending | RH template and preview APIs | API RED/GREEN, tenant denial tests, no raw CPF in responses | Required |
| 3 | Pending | Commit/import repository and sanitized audit | write transaction tests, duplicate/cross-tenant tests, audit redaction tests | Required |
| 4 | Pending | RH UI buttons, modal/page, onboarding entrypoint | source/UI tests, manual local smoke | Required |
| 5 | Pending | DSAR/self export and projection hardening | privacy tests, no leadership/RH broad PII projection | Required |
| 6 | Pending | Visual evidence and final hardening | Playwright screenshot desktop/mobile, `tsc`, focused suite, `git diff --check` | Required final review |

## Final Evidence Required

- Local commit hash for each wave.
- Claude review output or summarized finding receipt for each wave.
- `npx vitest run tests/unit/employee-import.test.ts` and all import API/UI tests.
- `npx vitest run tests/unit/tenant-api-hardening.test.ts tests/unit/privacy/gamification-safe-projection.test.ts`.
- `npx tsc --noEmit --pretty false`.
- `git diff --check`.
- Screenshot paths for complete UI on desktop and mobile.
- Final status: PASS, HOLD, or BLOCKED. Production remains HOLD until user approves.

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

## Task 1 / Wave 1: Contract, Parser, And Migration Foundation

**Files:**
- Create: `tests/unit/employee-import.test.ts`
- Create: `src/lib/employee-import/contract.ts`
- Create: `src/lib/employee-import/parser.ts`
- Create: `src/lib/db/migrations/065_employee_identity_imports.sql`

- [x] **Step 1: Write failing tests**

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

- [x] **Step 2: Run tests and verify RED**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts
```

Expected: fail because `@/lib/employee-import/contract` does not exist.

- [x] **Step 3: Implement minimal contract/parser/migration**

Create the files listed above. The parser must return safe preview rows with `cpfHash` and `cpfLast4`, not raw CPF.

- [x] **Step 4: Run tests and verify GREEN**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts
```

Expected: all tests pass.

Receipt: Wave 1 is committed at `f97218d`. It added `contract.ts`, `parser.ts`, migration `065`, and `tests/unit/employee-import.test.ts`. It passed employee import RED/GREEN, tenant/gamification focused tests, typecheck, mojibake check, and diff check. Retrospective Claude review is still required under the new goal protocol.

## Task 1.1 / Wave 1.1: Claude Medium Finding Fixes

**Claude review command:**

```powershell
claude -p "Review the current UniHER employee spreadsheet import goal plan and completed Wave 1 foundation at commit f97218d. Focus on tenant isolation, PII exposure, audit/log leakage, route authorization, tests, scope drift, and the plan's Claude-review/visual-evidence protocol. Do not edit files. Return findings ordered by severity with file paths and line references when possible. If no High/Critical issue exists, say so explicitly and list medium/low recommendations."
```

**Findings:** No High/Critical. Medium findings were unsalted CPF hash, missing soft delete/restrict in migration, RG plaintext in preview/storage, and missing CPF check-digit validation.

**Fixes applied:**
- `src/lib/employee-import/parser.ts` now hashes CPF/RG with HMAC-SHA256 using `UNIHER_EMPLOYEE_IMPORT_HMAC_SECRET` or `EMPLOYEE_IMPORT_PII_HMAC_SECRET`; production requires a secret with at least 32 characters.
- `src/lib/employee-import/parser.ts` validates CPF check digits and rejects repeated invalid CPFs.
- `src/lib/employee-import/parser.ts` returns `rgHash` and `rgLast4`, never raw RG.
- `src/lib/db/migrations/065_employee_identity_imports.sql` uses `ON DELETE RESTRICT` for company FKs and adds `deleted_at` to profile/batch tables.
- `tests/unit/employee-import.test.ts` covers HMAC secret variance, invalid CPF rejection, RG non-echoing, soft-delete columns, and company FK restrict behavior.

**Verification:**

```powershell
npx vitest run tests/unit/employee-import.test.ts
npx vitest run tests/unit/employee-import.test.ts tests/unit/tenant-api-hardening.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
npx tsc --noEmit --pretty false
git diff --check
```

**Claude re-review result:** Wave 1.1 PASS. All previous Medium findings resolved. No High/Critical/Medium findings remained. Low FK test recommendation was addressed by enabling `PRAGMA foreign_keys = ON` and asserting company deletion is restricted when a profile exists.

**Result:** 6/6 employee import tests passed; 33/33 focused tests passed; typecheck passed; diff check passed with CRLF warnings only.

## Task 2 / Wave 2: RH Preview API

**Files:**
- Create: `src/app/api/rh/employees/import-template/route.ts`
- Create: `src/app/api/rh/employees/import-preview/route.ts`
- Test: `tests/unit/employee-import-api.test.ts`

- [x] **Step 1: Write failing API tests**

Test RH only, persisted actor company validation, template content type, preview rejects collaborator/leader, and preview never echoes raw CPF.

- [x] **Step 2: Implement template and preview routes**

Use `withRole('rh', 'admin')`, re-read actor from `users` with `id`, `company_id`, persisted `role`, `deleted_at IS NULL`, `blocked=0`, `approved=1`. Parse `text/csv` or multipart file content into `parseEmployeeImportCsv`.

- [x] **Step 3: Run focused API tests**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts
```

Expected: all tests pass.

**Wave 2 initial result:** API template and preview routes were implemented with persisted actor re-checks and collaborator/leadership denials.

**Claude Wave 2 review result:** HOLD. No High/Critical findings, but two Medium findings blocked promotion: preview response exposed direct PII fields from parsed rows, and the parser had no explicit row-count cap.

**Wave 2.1 security fixes:**
- Preview response now returns only masked DTO fields (`fullNamePreview`, `emailPreview`, CPF/RG last4) plus summary counts.
- Error rows no longer expose raw email; they use `emailPreview`.
- Parser rejects files above `MAX_EMPLOYEE_IMPORT_ROWS` before row mapping.
- HMAC fallback is allowed only under explicit `development` or `test`; staging/production-like runtimes require a 32+ character secret.
- Preview validates the spreadsheet `EMPRESA` value against the persisted actor company name.
- Preview audit uses `employee_import_preview` and stores only actor/company/count details, never row payload or direct PII.

**Wave 2.1 RED/GREEN:**

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts
```

RED: 5 expected failures for unmasked preview, missing company-name validation, error email exposure, missing row cap, and permissive non-test HMAC fallback.

GREEN: 14/14 tests passed after the security fixes.

**Wave 2.1 gates:**
- `npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts tests/unit/tenant-api-hardening.test.ts tests/unit/invite-leadership-capability.test.ts tests/unit/community-company-setting-audit.test.ts tests/unit/privacy/gamification-safe-projection.test.ts` -> PASS, 45/45 tests.
- `npx tsc --noEmit --pretty false` -> PASS.
- `git diff --check` -> PASS, CRLF warnings only.
- `rg -n 'Ã|Â|â'` on changed import files -> only valid Portuguese `MÃE`/accented headers; no mojibake such as `Â` or `â`.

**Claude re-review result:** Wave 2.1 PASS. No High/Critical/Medium findings. Previous Medium findings resolved, and the Low audit-IP finding was fixed by recording the first forwarded IP or `x-real-ip` in `employee_import_preview`.

## Task 3 / Wave 3: Commit API And Audit

**Files:**
- Create: `src/app/api/rh/employees/import-commit/route.ts`
- Create: `src/lib/employee-import/repository.ts`
- Modify: `src/lib/audit.ts`
- Test: `tests/unit/employee-import-api.test.ts`

- [x] **Step 1: Write failing commit tests**

Cover valid commit, duplicate same-company CPF rejection/upsert, cross-company CPF allowed, department/company mismatch rejection, and sanitized audit details.

- [x] **Step 2: Implement repository and commit route**

Persist through WriteQueue. Audit action should store only batch counts, file hash, and status, never CPF, RG, phone, address, or raw row JSON.

- [x] **Step 3: Run focused commit tests**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts
```

Expected: all tests pass.

**Wave 3 RED/GREEN:**

```powershell
npx vitest run tests/unit/employee-import-api.test.ts
```

RED: expected failure because `src/app/api/rh/employees/import-commit/route.ts` did not exist.

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts
```

GREEN: 17/17 tests passed after adding the shared CSV body reader, commit route, repository transaction, same-company upsert, cross-company allowance, parse-error rejection, and sanitized audit.

**Claude Wave 3 initial review result:** PASS with one Medium advisory for filename sanitization/length bound and extension whitelist. Treated as blocking for zero-finding readiness.

**Wave 3.1 filename hardening:**
- `readEmployeeImportCsvBody` sanitizes filenames, strips path separators/control characters/dangerous symbols, and caps to 255 characters.
- Multipart/JSON filenames must end in `.csv` when a filename is present.
- Stored batch filename and audit entity label receive the sanitized filename only.
- RED: `npx vitest run tests/unit/employee-import-api.test.ts` failed on unsafe filename persistence.
- GREEN: `npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts` passed 18/18 tests.

**Wave 3.1 gates:**
- `npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts tests/unit/tenant-api-hardening.test.ts tests/unit/invite-leadership-capability.test.ts tests/unit/community-company-setting-audit.test.ts tests/unit/privacy/gamification-safe-projection.test.ts` -> PASS, 49/49 tests.
- `npx tsc --noEmit --pretty false` -> PASS.
- `git diff --check` -> PASS, CRLF warnings only.
- `rg -n 'Ã|Â|â'` on changed import files -> only valid Portuguese `MÃE`/accented headers and this receipt; no mojibake `Â`/`â`.

**Claude final review result:** Wave 3/3.1 PASS. No Critical/High/Medium findings. Filename stored-XSS advisory resolved with sanitization, length cap, and `.csv` filename whitelist.

## Task 4 / Wave 4: UI Entry Points

**Files:**
- Modify: `src/app/(platform)/colaboradoras-gestao/page.tsx`
- Modify: `src/app/(platform)/onboarding-rh/page.tsx`
- Modify: `src/app/(platform)/convites/page.tsx`
- Test: add or extend focused UI tests if existing harness supports it.

- [x] **Step 1: Add failing source-contract tests**

Assert `colaboradoras-gestao` contains `Importar planilha` and calls RH import endpoints; assert onboarding points collaborator setup to `/colaboradoras-gestao`.

- [x] **Step 2: Implement UI controls**

Place `Importar planilha` and `Baixar modelo` in the collaborator management header and empty state. Keep `Convites` as manual invite surface.

- [x] **Step 3: Run UI/source tests and visual smoke when viable**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts
npm run test:rh
```

Expected: focused import tests pass; RH smoke still passes or any visual gap is documented.

**Wave 4 RED/GREEN:**
- RED: `npx vitest run tests/unit/employee-import-ui.test.ts` failed because collaborator management lacked import CTAs/endpoints and RH onboarding still pointed collaborator setup to `/convites`.
- GREEN: `npx vitest run tests/unit/employee-import-ui.test.ts` passed 3/3 after adding the source contract, import CTAs, preview/commit UI, safe masked preview rendering, and onboarding link to `/colaboradoras-gestao`.

**Wave 4 gates:**
- `npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts tests/unit/employee-import-ui.test.ts tests/unit/tenant-api-hardening.test.ts tests/unit/invite-leadership-capability.test.ts tests/unit/community-company-setting-audit.test.ts tests/unit/privacy/gamification-safe-projection.test.ts` -> PASS, 52/52 tests.
- `npx tsc --noEmit --pretty false` -> PASS.
- `rg -n 'Ã|Â|â'` on changed UI files -> PASS, no matches.

**Claude Wave 4 initial review result:** PASS with Medium advisories for onboarding admin mismatch, client double-submit, and server duplicate CSV idempotency. Treated as blocking for zero-finding readiness.

**Wave 4.1 advisory fixes:**
- Onboarding RH accepts `rh` and `admin`, matching the management page and import APIs.
- Commit button has immediate `useRef` in-flight guard in addition to status-based disabling.
- Commit repository is idempotent for exact duplicate CSV per company and returns the original batch with `duplicate: true`.
- Migration `066_employee_import_batch_idempotency.sql` adds a partial unique index on `(company_id, file_sha256)` for non-deleted batches.
- Tests cover duplicate exact CSV, same-company changed CSV upsert, cross-company allowance, and the migration index.

**Wave 4.1 gates:**
- `npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts tests/unit/employee-import-ui.test.ts` -> PASS, 21/21 tests.
- `npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts tests/unit/employee-import-ui.test.ts tests/unit/tenant-api-hardening.test.ts tests/unit/invite-leadership-capability.test.ts tests/unit/community-company-setting-audit.test.ts tests/unit/privacy/gamification-safe-projection.test.ts` -> PASS, 52/52 tests.
- `npx tsc --noEmit --pretty false` -> PASS.
- `git diff --check` -> PASS, CRLF warnings only.

**Claude re-review result:** Wave 4/4.1 PASS. No Critical/High/Medium findings. M1/M2/M3 resolved.

## Task 5 / Wave 5: DSAR And Projection Hardening

**Files:**
- Modify: `src/lib/privacy/dsar-export.ts`
- Modify: `src/lib/gamification/containment.ts` only if new sensitive keys need generic projection blocking.
- Test: `tests/unit/employee-import.test.ts` or `tests/unit/privacy/employee-import-privacy.test.ts`

- [x] **Step 1: Write failing privacy tests**

Assert the collaborator's own export includes her employee identity profile, while RH/leadership/team/list projections do not expose CPF hash, RG, phone, address, mother name, or health plan.

- [x] **Step 2: Implement DSAR export section**

Add an `employeeIdentityProfile` section filtered by `user_id = ?` or equivalent self-owned link. Do not add any RH/admin bulk export.

- [x] **Step 3: Run privacy gates**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
```

Expected: all tests pass.

**Wave 5 RED/GREEN:**
- RED: `npx vitest run tests/unit/privacy/employee-import-privacy.test.ts` failed because DSAR did not include the imported self-profile and generic safe projection did not remove imported identity fields.
- GREEN: `npx vitest run tests/unit/privacy/employee-import-privacy.test.ts` passed 2/2 after adding `employeeIdentityProfile` to DSAR and expanding the projection denylist for CPF/RG hashes/last4, mother name, birth date, marital status, health plan, phone and address fields.

**Claude Wave 5 initial review result:** PASS with one Medium finding: safe projection still allowed `sex`, address `number`, `city`, and `uf` if an imported identity object was accidentally projected.

**Wave 5.1 privacy fix:**
- Added `sex`, `number`, `city`, and `uf` to `FORBIDDEN_PROJECTION_KEYS`.
- Extended `tests/unit/privacy/employee-import-privacy.test.ts` to assert those fields do not appear in generic safe projections.

**Wave 5.1 gates:**
- `npx vitest run tests/unit/privacy/employee-import-privacy.test.ts tests/unit/privacy/gamification-safe-projection.test.ts` -> PASS, 18/18 tests.
- `npx vitest run tests/unit/employee-import.test.ts tests/unit/employee-import-api.test.ts tests/unit/employee-import-ui.test.ts tests/unit/privacy/employee-import-privacy.test.ts tests/unit/tenant-api-hardening.test.ts tests/unit/invite-leadership-capability.test.ts tests/unit/community-company-setting-audit.test.ts tests/unit/privacy/gamification-safe-projection.test.ts` -> PASS, 54/54 tests.
- `npx tsc --noEmit --pretty false` -> PASS.
- `git diff --check` -> PASS, CRLF warnings only.
- `rg -n 'Ã|Â|â'` on Wave 5 files -> PASS, no matches.

**Claude re-review result:** Wave 5/5.1 PASS. No Critical/High/Medium findings. Claude could not run tests directly due local permission, but reviewed code and accepted the Medium resolution; local tests above are the source-of-truth gate.

## Task 6 / Wave 6: Visual Evidence And Final Hardening

**Files:**
- Create evidence screenshots under `docs/superpowers/evidence/employee-import-*`.
- Modify tests only for final smoke support if needed.

- [ ] **Step 1: Start local app**

Run the local dev server or production build/start, using a free port if `3000` is occupied.

- [ ] **Step 2: Capture screenshots**

Capture desktop and mobile screenshots of `Gestao de Colaboradoras` showing:
- `Importar planilha`
- `Baixar modelo`
- preview state
- validation error state

- [ ] **Step 3: Run final gates**

Run:

```powershell
npx vitest run tests/unit/employee-import.test.ts tests/unit/tenant-api-hardening.test.ts tests/unit/privacy/gamification-safe-projection.test.ts
npx tsc --noEmit --pretty false
git diff --check
```

Expected: all pass.

## Governance Gates

- `npx vitest run tests/unit/employee-import.test.ts`
- Import API focused tests once Task 2 starts.
- `npx vitest run tests/unit/tenant-api-hardening.test.ts tests/unit/privacy/gamification-safe-projection.test.ts`
- `npx tsc --noEmit --pretty false`
- `git diff --check`
- `rg -n "CPF|RG|TELEFONE|LOGRADOURO|cpf|rg|phone|address" src/app/api src/lib tests/unit/employee-import*` before closeout to inspect sensitive exposures.

## Release Rule

Do not enable XLSX upload in V1 unless a parser dependency is explicitly approved and audited. CSV is operational first because the repo has no XLSX dependency today.
