/**
 * Playwright global teardown — clean test data after all tests
 */
import Database from 'better-sqlite3';
import path from 'path';

export default async function globalTeardown() {
  const dbPath = path.join(__dirname, '..', 'data', 'uniher.db');

  try {
    const db = new Database(dbPath);
    db.pragma('foreign_keys = OFF');

    // Keep only real users (not test-created)
    const testPatterns = [
      "email LIKE '%test-%'",
      "email LIKE 'admin-master-%'",
      "email LIKE 'admin-dup-%'",
      "email LIKE 'admin-teste-%'",
      "email LIKE 'colab-test-%'",
      "email LIKE 'rh-test-%'",
      "email LIKE 'rh-seg-%'",
      "email LIKE 'rh-admin-%'",
      "email LIKE 'colab-seg-%'",
      "email LIKE 'api-test-%'",
    ];
    const where = testPatterns.join(' OR ');

    // Get test user IDs for cascade cleanup
    const testUsers = db.prepare(`SELECT id FROM users WHERE ${where}`).all() as { id: string }[];
    const testUserIds = testUsers.map(u => u.id);

    if (testUserIds.length > 0) {
      const ph = testUserIds.map(() => '?').join(',');
      try { db.prepare(`DELETE FROM refresh_tokens WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM notifications WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM health_events WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM user_badges WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM user_preferences WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      db.prepare(`DELETE FROM users WHERE ${where}`).run();
    }

    // Clean test companies
    const testCompanies = db.prepare(
      "SELECT id FROM companies WHERE name LIKE 'Empresa RH%' OR name LIKE 'Empresa Colab%' OR name LIKE 'Empresa Int%' OR name LIKE 'Empresa Seg%'"
    ).all() as { id: string }[];

    for (const c of testCompanies) {
      try { db.prepare('DELETE FROM departments WHERE company_id = ?').run(c.id); } catch {}
      try { db.prepare('DELETE FROM invites WHERE company_id = ?').run(c.id); } catch {}
      db.prepare('DELETE FROM companies WHERE id = ?').run(c.id);
    }

    // Clean test departments
    db.prepare("DELETE FROM departments WHERE name LIKE 'Audit%'").run();

    // Clean audit logs from tests
    db.prepare('DELETE FROM audit_logs').run();

    db.pragma('foreign_keys = ON');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();

    console.log(`[Teardown] Cleaned ${testUsers.length} test users, ${testCompanies.length} test companies`);
  } catch (err) {
    console.warn('[Teardown] Failed:', err);
  }
}
