import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('health check-in migration numbering', () => {
  it('uses a migration number that does not collide with the current main migration range', () => {
    const migrationsDir = path.join(process.cwd(), 'src/lib/db/migrations');

    expect(existsSync(path.join(migrationsDir, '048_user_exams_source.sql'))).toBe(false);
    expect(existsSync(path.join(migrationsDir, '067_user_exams_source.sql'))).toBe(true);
  });
});
