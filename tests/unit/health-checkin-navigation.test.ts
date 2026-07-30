import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('health check-in navigation surface', () => {
  it('exposes the exam quiz as an authenticated platform page in the collaborator menu', () => {
    const pagePath = path.join(process.cwd(), 'src/app/(platform)/health-checkin/page.tsx');
    const sidebarPath = path.join(process.cwd(), 'src/components/platform/Sidebar.tsx');

    expect(existsSync(pagePath)).toBe(true);
    expect(readFileSync(sidebarPath, 'utf8')).toContain("href: '/health-checkin'");
  });
});
