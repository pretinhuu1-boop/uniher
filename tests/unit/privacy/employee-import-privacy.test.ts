import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyMigration } from '@/lib/db/migrations/runner';
import { toSafeUserProjection } from '@/lib/gamification/containment';
import { createDsarExportJsonChunks } from '@/lib/privacy/dsar-export';

function createDsarDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      department_id TEXT,
      name TEXT,
      email TEXT,
      role TEXT,
      avatar_url TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 0,
      league TEXT,
      created_at TEXT,
      updated_at TEXT
    );
    CREATE TABLE companies (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE quiz_results (id TEXT PRIMARY KEY, user_id TEXT, archetype_id TEXT, answers_json TEXT, created_at TEXT);
    CREATE TABLE notifications (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT, read INTEGER, created_at TEXT);
    CREATE TABLE badges (id TEXT PRIMARY KEY, name TEXT, description TEXT);
    CREATE TABLE user_badges (user_id TEXT, badge_id TEXT, unlocked_at TEXT);
    CREATE TABLE health_scores (id TEXT PRIMARY KEY, user_id TEXT, dimension TEXT, score REAL, recorded_at TEXT);
    CREATE TABLE challenges (id TEXT PRIMARY KEY, title TEXT);
    CREATE TABLE user_challenges (user_id TEXT, challenge_id TEXT, progress INTEGER, status TEXT, started_at TEXT, completed_at TEXT);
    CREATE TABLE activity_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, target_type TEXT, target_id TEXT, points_earned INTEGER, created_at TEXT);
    CREATE TABLE mission_logs (id TEXT PRIMARY KEY, user_id TEXT, mission_id TEXT, action TEXT, day TEXT, mood TEXT, glasses INTEGER, challenge_id TEXT, note TEXT, created_at TEXT);
    INSERT INTO companies (id, name) VALUES ('company-a', 'Empresa A');
    INSERT INTO users (id, company_id, department_id, name, email, role, created_at, updated_at)
    VALUES ('user-a', 'company-a', NULL, 'Ana Silva', 'ana@example.com', 'colaboradora', '2026-01-01', '2026-01-02');
  `);
  applyMigration(
    db,
    '065_employee_identity_imports.sql',
    fs.readFileSync(path.join(process.cwd(), 'src/lib/db/migrations/065_employee_identity_imports.sql'), 'utf8'),
  );
  db.prepare(`
    INSERT INTO employee_identity_profiles (
      id, company_id, user_id, full_name, mother_name, cpf_hash, cpf_last4,
      rg_hash, rg_last4, rg_issuer, birth_date, sex, marital_status,
      health_plan, cep, street_type, street, number, complement,
      neighborhood, city, uf, email, ddd, phone
    )
    VALUES (
      'profile-a', 'company-a', 'user-a', 'Ana Silva', 'Maria Silva',
      'cpf-secret-hash', '8909', 'rg-secret-hash', '6789', 'SSP',
      '1990-03-15', 'F', 'Solteira', 'Unimed', '01001000',
      'Rua', 'Boa Vista', '100', 'Apto 2', 'Centro', 'Sao Paulo',
      'SP', 'ana@example.com', '11', '999990000'
    )
  `).run();
  return db;
}

describe('employee import privacy surfaces', () => {
  it('includes the collaborator own imported identity profile in DSAR without internal hashes', () => {
    const db = createDsarDatabase();
    try {
      const exported = JSON.parse(Array.from(createDsarExportJsonChunks(db, 'user-a', '2026-07-28T00:00:00.000Z')).join(''));

      expect(exported.employeeIdentityProfile).toMatchObject({
        id: 'profile-a',
        company_id: 'company-a',
        full_name: 'Ana Silva',
        mother_name: 'Maria Silva',
        cpf_last4: '8909',
        rg_last4: '6789',
        health_plan: 'Unimed',
        phone: '999990000',
      });
      expect(JSON.stringify(exported.employeeIdentityProfile)).not.toContain('cpf-secret-hash');
      expect(JSON.stringify(exported.employeeIdentityProfile)).not.toContain('rg-secret-hash');
      expect(exported.employeeIdentityProfile).not.toHaveProperty('cpf_hash');
      expect(exported.employeeIdentityProfile).not.toHaveProperty('rg_hash');
    } finally {
      db.close();
    }
  });

  it('includes an imported identity profile that was not linked to the accepted user yet', () => {
    const db = createDsarDatabase();
    try {
      db.exec(`
        INSERT INTO companies (id, name) VALUES ('company-b', 'Empresa B');
        UPDATE employee_identity_profiles SET user_id = NULL WHERE id = 'profile-a';
        INSERT INTO employee_identity_profiles (
          id, company_id, user_id, full_name, mother_name, cpf_hash, cpf_last4,
          email, deleted_at
        )
        VALUES (
          'profile-cross-company', 'company-b', NULL, 'Ana Outra Empresa', 'Outra Mae',
          'cpf-cross-company-secret', '0000', 'ana@example.com', NULL
        );
      `);

      const exported = JSON.parse(Array.from(createDsarExportJsonChunks(db, 'user-a', '2026-07-28T00:00:00.000Z')).join(''));

      expect(exported.employeeIdentityProfile).toMatchObject({
        id: 'profile-a',
        company_id: 'company-a',
        full_name: 'Ana Silva',
        cpf_last4: '8909',
        email: 'ana@example.com',
      });
      expect(JSON.stringify(exported.employeeIdentityProfile)).not.toContain('cpf-secret-hash');
      expect(JSON.stringify(exported)).not.toContain('profile-cross-company');
      expect(JSON.stringify(exported)).not.toContain('cpf-cross-company-secret');
    } finally {
      db.close();
    }
  });

  it('removes imported identity fields from generic safe user projections', () => {
    const projected = toSafeUserProjection({
      team: [{
        id: 'user-a',
        name: 'Ana Silva',
        email: 'ana@example.com',
        employeeIdentityProfile: {
          cpf_hash: 'cpf-secret-hash',
          cpf_last4: '8909',
          rg_hash: 'rg-secret-hash',
          rg_last4: '6789',
          mother_name: 'Maria Silva',
          health_plan: 'Unimed',
          phone: '999990000',
          sex: 'F',
          cep: '01001000',
          street: 'Boa Vista',
          number: '100',
          complement: 'Apto 2',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          uf: 'SP',
        },
      }],
    });

    const serialized = JSON.stringify(projected);
    expect(serialized).toContain('Ana Silva');
    expect(serialized).toContain('ana@example.com');
    expect(serialized).not.toContain('cpf-secret-hash');
    expect(serialized).not.toContain('rg-secret-hash');
    expect(serialized).not.toContain('8909');
    expect(serialized).not.toContain('Maria Silva');
    expect(serialized).not.toContain('Unimed');
    expect(serialized).not.toContain('999990000');
    expect(serialized).not.toContain('Boa Vista');
    expect(serialized).not.toContain('Sao Paulo');
    expect(serialized).not.toContain('01001000');
  });
});
