import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('health check-in navigation surface', () => {
  it('keeps the exam quiz inside the existing Semaforo page without a parallel section', () => {
    const semaforoPagePath = path.join(process.cwd(), 'src/app/(platform)/semaforo/page.tsx');
    const parallelPagePath = path.join(process.cwd(), 'src/app/(platform)/health-checkin/page.tsx');
    const sidebarPath = path.join(process.cwd(), 'src/components/platform/Sidebar.tsx');
    const semaforoPage = readFileSync(semaforoPagePath, 'utf8');
    const sidebar = readFileSync(sidebarPath, 'utf8');

    expect(semaforoPage).toContain('ExamSemaphoreQuiz');
    expect(sidebar).toContain("href: '/semaforo'");
    expect(sidebar).not.toContain("href: '/health-checkin'");
    expect(existsSync(parallelPagePath)).toBe(false);
  });
});
