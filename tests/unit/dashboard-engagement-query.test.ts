import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { ENGAGEMENT_RETENTION_QUERY } from '@/services/dashboard.service';

describe('dashboard engagement queries', () => {
  it('executes the retention query when joined tables both have created_at', () => {
    const db = new Database(':memory:');
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE activity_log (
        id INTEGER PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      INSERT INTO users (id, company_id, created_at)
      VALUES ('user-1', 'company-1', datetime('now', '-1 year'));
      INSERT INTO activity_log (user_id, created_at)
      VALUES
        ('user-1', datetime('now', 'start of month', '-1 month', '+1 day')),
        ('user-1', datetime('now', 'start of month', '+1 day'));
    `);

    const rows = db.prepare(ENGAGEMENT_RETENTION_QUERY).all('company-1', 'company-1');

    const currentMonth = db.prepare("SELECT strftime('%Y-%m', 'now') AS ym")
      .get() as { ym: string };

    expect(rows).toEqual([
      {
        ym: currentMonth.ym,
        retained: 1,
      },
    ]);
    db.close();
  });
});
