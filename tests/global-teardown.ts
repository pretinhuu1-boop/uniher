/**
 * Playwright global teardown — clean test data after all tests
 */
import type Database from 'better-sqlite3';
import path from 'node:path';

import playwrightDbSafety from './playwright-db-safety.cjs';

export function cleanupCommunityData(
  db: Database.Database,
  companyIds: readonly string[],
  userIds: readonly string[],
) {
  const previousForeignKeys = Number(db.pragma('foreign_keys', { simple: true }));
  db.pragma('foreign_keys = ON');

  try {
    db.transaction(() => {
      if (companyIds.length > 0) {
        const placeholders = companyIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM community_post_supports WHERE post_id IN (SELECT id FROM community_posts WHERE company_id IN (${placeholders}))`).run(...companyIds);
        db.prepare(`DELETE FROM community_post_saves WHERE post_id IN (SELECT id FROM community_posts WHERE company_id IN (${placeholders}))`).run(...companyIds);
        db.prepare(`DELETE FROM community_posts WHERE company_id IN (${placeholders})`).run(...companyIds);
        db.prepare(`DELETE FROM company_settings WHERE company_id IN (${placeholders})`).run(...companyIds);
      }

      if (userIds.length > 0) {
        const placeholders = userIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM community_post_supports WHERE user_id IN (${placeholders})`).run(...userIds);
        db.prepare(`DELETE FROM community_post_saves WHERE user_id IN (${placeholders})`).run(...userIds);
        db.prepare(`DELETE FROM community_post_supports WHERE post_id IN (SELECT id FROM community_posts WHERE created_by IN (${placeholders}) OR updated_by IN (${placeholders}))`).run(...userIds, ...userIds);
        db.prepare(`DELETE FROM community_post_saves WHERE post_id IN (SELECT id FROM community_posts WHERE created_by IN (${placeholders}) OR updated_by IN (${placeholders}))`).run(...userIds, ...userIds);
        db.prepare(`DELETE FROM community_posts WHERE created_by IN (${placeholders}) OR updated_by IN (${placeholders})`).run(...userIds, ...userIds);
      }
    })();
  } finally {
    db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
  }
}

export function closeTeardownDatabase(
  db: Database.Database,
  previousForeignKeys: number,
) {
  try {
    db.pragma(`foreign_keys = ${previousForeignKeys ? 'ON' : 'OFF'}`);
    db.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    db.close();
  }
}

export default async function globalTeardown() {
  const externalBaseUrl = process.env.BASE_URL?.trim();
  let dbPath: string;

  if (externalBaseUrl) {
    if (process.env.COLLABORATOR_JOURNEY_EXTERNAL_SAME_DATABASE !== '1') {
      console.log('[Teardown] Skipped local database cleanup for external BASE_URL');
      return;
    }

    dbPath = playwrightDbSafety.assertSafePlaywrightDatabaseEnvironment(process.env);
    const attestedPath = process.env.COLLABORATOR_JOURNEY_EXTERNAL_DATABASE_PATH?.trim();
    if (!attestedPath || path.resolve(attestedPath) !== dbPath) {
      throw new Error('Refusing external BASE_URL cleanup without collaborator-journey same-database attestation');
    }
    console.log('[Teardown] Running cleanup for attested collaborator-journey external BASE_URL');
  } else {
    dbPath = playwrightDbSafety.assertSafePlaywrightDatabaseEnvironment(process.env);
  }

  const { default: DatabaseConstructor } = await import('better-sqlite3');
  let db: Database.Database | undefined;
  let previousForeignKeys = 0;

  try {
    db = new DatabaseConstructor(dbPath);
    previousForeignKeys = Number(db.pragma('foreign_keys', { simple: true }));
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
      "email LIKE 'mobile-%'",
      "email LIKE 'community-feed-test-%'",
      "email LIKE 'rh-colab-journey-%'",
      "email LIKE 'colab-journey-%'",
    ];
    const where = testPatterns.join(' OR ');
    const testCompanyWhere = "name LIKE 'Empresa RH%' OR name LIKE 'Empresa Colab%' OR name LIKE 'Empresa Int%' OR name LIKE 'Empresa Seg%' OR name LIKE 'Empresa Mobile%' OR name LIKE 'Community Feed E2E %'";

    // Get test user IDs for cascade cleanup
    const testUsers = db.prepare(`SELECT id FROM users WHERE ${where}`).all() as { id: string }[];
    const testUserIds = testUsers.map(u => u.id);
    const testCompanies = db.prepare(
      `SELECT id FROM companies WHERE ${testCompanyWhere}`
    ).all() as { id: string }[];
    const testCompanyIds = testCompanies.map(company => company.id);

    cleanupCommunityData(db, testCompanyIds, testUserIds);

    if (testUserIds.length > 0) {
      const ph = testUserIds.map(() => '?').join(',');
      try { db.prepare(`DELETE FROM refresh_tokens WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM notifications WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM health_events WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM user_exams WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM user_campaigns WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM user_company_challenges WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM eligible_participation_event_revocations WHERE event_id IN (SELECT id FROM eligible_participation_events WHERE user_id IN (${ph}))`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM eligible_participation_events WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM alert_preferences WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM notification_preferences WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM push_subscriptions WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM user_badges WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      try { db.prepare(`DELETE FROM user_preferences WHERE user_id IN (${ph})`).run(...testUserIds); } catch {}
      db.prepare(`DELETE FROM users WHERE ${where}`).run();
    }

    // Clean test companies
    for (const c of testCompanies) {
      try { db.prepare('DELETE FROM user_campaigns WHERE campaign_id IN (SELECT id FROM campaigns WHERE company_id = ?)').run(c.id); } catch {}
      try { db.prepare('DELETE FROM campaigns WHERE company_id = ?').run(c.id); } catch {}
      try { db.prepare('DELETE FROM departments WHERE company_id = ?').run(c.id); } catch {}
      try { db.prepare('DELETE FROM invites WHERE company_id = ?').run(c.id); } catch {}
      db.prepare('DELETE FROM companies WHERE id = ?').run(c.id);
    }

    // Clean test departments
    db.prepare("DELETE FROM departments WHERE name LIKE 'Audit%'").run();

    // Clean audit logs from tests
    db.prepare('DELETE FROM audit_logs').run();

    console.log(`[Teardown] Cleaned ${testUsers.length} test users, ${testCompanies.length} test companies`);
  } catch (err) {
    console.warn('[Teardown] Failed:', err);
    throw err;
  } finally {
    if (db) {
      closeTeardownDatabase(db, previousForeignKeys);
    }
  }
}
