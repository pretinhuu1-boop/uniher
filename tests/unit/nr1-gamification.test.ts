// ─────────────────────────────────────────────────────────────────────────────
// Testes BLOQUEANTES da integração gamificação × NR-1 (COPSOQ).
// Garantem os invariantes de conformidade exigidos na revisão adversarial:
//  1. Concluir credita EXATAMENTE xp_nr1 (nem 1 ponto a mais → sem duplo-crédito por badge).
//  2. NÃO entra na liga (user_leagues.week_points) — fora do ranking entre colegas.
//  3. NÃO toca daily_xp_earned/streak — sem pressão temporal sobre as respostas.
//  4. NÃO cria/lê health_scores — muro LGPD (gamificação não toca dado clínico).
//  5. Idempotente — re-submit/refazer é no-op (zero XP), sem duplo-crédito.
//
// DB isolado em arquivo temporário via DATABASE_PATH (não toca o banco de dev).
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import os from 'os';
import path from 'path';
import fs from 'fs';

// IMPORTANTE: setar a env ANTES de qualquer import do módulo de DB
// (src/lib/db lê DATABASE_PATH no momento do load).
const TMP = path.join(os.tmpdir(), `uniher-nr1-${process.pid}-${Date.now()}.db`);
process.env.DATABASE_PATH = TMP;
process.env.YAVIX_MOCK = '1';

const COMPANY_ID = 'co-test';
const USER_ID = 'u-test';

type DbMod = typeof import('../../src/lib/db');
type GamMod = typeof import('../../src/services/gamification.service');

let db: DbMod;
let gam: GamMod;

beforeAll(async () => {
  db = await import('../../src/lib/db');
  const runner = await import('../../src/lib/db/migrations/runner');
  gam = await import('../../src/services/gamification.service');

  await runner.runMigrations();

  const wq = db.getWriteQueue();
  await wq.enqueue((d) => {
    d.prepare("INSERT INTO companies (id, name, cnpj) VALUES (?, 'Test Co', '00000000000000')").run(COMPANY_ID);
    d.prepare(
      "INSERT INTO users (id, company_id, name, email, password_hash, role) VALUES (?, ?, 'Colab', 'colab@test.local', 'x', 'colaboradora')",
    ).run(USER_ID, COMPANY_ID);
    // só company_id → demais colunas (incl. xp_nr1 DEFAULT 60) assumem o default
    d.prepare('INSERT INTO gamification_config (company_id) VALUES (?)').run(COMPANY_ID);
  });
});

afterAll(() => {
  db.closeDb();
  for (const f of [TMP, `${TMP}-wal`, `${TMP}-shm`]) {
    try {
      fs.rmSync(f, { force: true });
    } catch {
      /* noop */
    }
  }
});

describe('awardNr1Completion — conformidade NR-1/LGPD', () => {
  it('credita EXATAMENTE xp_nr1 (60) e desbloqueia badge_nr1, sem pontos extras', async () => {
    const r = await gam.awardNr1Completion(USER_ID, COMPANY_ID);
    expect(r).toEqual({ xpEarned: 60, alreadyAwarded: false });

    const rdb = db.getReadDb();
    const u = rdb.prepare('SELECT points FROM users WHERE id = ?').get(USER_ID) as { points: number };
    expect(u.points).toBe(60); // badge_nr1.points=0 → exatamente o XP, nem 1 a mais

    const badge = rdb
      .prepare("SELECT 1 AS ok FROM user_badges WHERE user_id = ? AND badge_id = 'badge_nr1'")
      .get(USER_ID);
    expect(badge).toBeTruthy();
  });

  it('NÃO entra na liga (nenhuma linha em user_leagues)', () => {
    const rdb = db.getReadDb();
    const lg = rdb.prepare('SELECT COUNT(*) AS c FROM user_leagues WHERE user_id = ?').get(USER_ID) as { c: number };
    expect(lg.c).toBe(0);
  });

  it('NÃO toca daily_xp_earned nem streak', () => {
    const rdb = db.getReadDb();
    const u = rdb.prepare('SELECT streak, daily_xp_earned FROM users WHERE id = ?').get(USER_ID) as {
      streak: number;
      daily_xp_earned: number | null;
    };
    expect(u.streak).toBe(0);
    expect(u.daily_xp_earned ?? 0).toBe(0);
  });

  it('NÃO cria nem lê health_scores (muro LGPD)', () => {
    const rdb = db.getReadDb();
    const hs = rdb.prepare('SELECT COUNT(*) AS c FROM health_scores WHERE user_id = ?').get(USER_ID) as { c: number };
    expect(hs.c).toBe(0);
  });

  it('é idempotente: segundo award é no-op (zero XP, sem duplo-crédito)', async () => {
    const r2 = await gam.awardNr1Completion(USER_ID, COMPANY_ID);
    expect(r2).toEqual({ xpEarned: 0, alreadyAwarded: true });

    const rdb = db.getReadDb();
    const u = rdb.prepare('SELECT points FROM users WHERE id = ?').get(USER_ID) as { points: number };
    expect(u.points).toBe(60); // permanece 60

    const logs = rdb
      .prepare("SELECT COUNT(*) AS c FROM activity_log WHERE user_id = ? AND action = 'earn_points_nr1_completed'")
      .get(USER_ID) as { c: number };
    expect(logs.c).toBe(1); // um único evento de crédito
  });
});
