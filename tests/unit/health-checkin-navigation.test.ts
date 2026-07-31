import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('health check-in navigation surface', () => {
  it('keeps the exam quiz inside the existing Semaforo page without a parallel section', () => {
    const semaforoPagePath = path.join(process.cwd(), 'src/app/(platform)/semaforo/page.tsx');
    const parallelPagePath = path.join(process.cwd(), 'src/app/(platform)/health-checkin/page.tsx');
    const sidebarPath = path.join(process.cwd(), 'src/components/platform/Sidebar.tsx');
    const quizPath = path.join(process.cwd(), 'src/components/semaforo/ExamSemaphoreQuiz.tsx');
    const legacyExamsRoutePath = path.join(process.cwd(), 'src/app/api/collaborator/exams/route.ts');
    const dashboardServicePath = path.join(process.cwd(), 'src/services/dashboard.service.ts');
    const collaboratorServicePath = path.join(process.cwd(), 'src/services/collaborator.service.ts');
    const semaphoreCalculatorPath = path.join(process.cwd(), 'src/services/semaforo-calculator.service.ts');
    const semaforoPage = readFileSync(semaforoPagePath, 'utf8');
    const sidebar = readFileSync(sidebarPath, 'utf8');
    const quiz = readFileSync(quizPath, 'utf8');
    const legacyExamsRoute = readFileSync(legacyExamsRoutePath, 'utf8');
    const dashboardService = readFileSync(dashboardServicePath, 'utf8');
    const collaboratorService = readFileSync(collaboratorServicePath, 'utf8');
    const semaphoreCalculator = readFileSync(semaphoreCalculatorPath, 'utf8');

    expect(semaforoPage).toContain('ExamSemaphoreQuiz');
    expect(sidebar).toContain("href: '/semaforo'");
    expect(sidebar).not.toContain("href: '/health-checkin'");
    expect(existsSync(parallelPagePath)).toBe(false);
    expect(quiz).toContain("fetch('/api/collaborator/health-checkin')");
    expect(quiz).toContain('type="date"');
    expect(quiz).not.toContain('type="number"');
    expect(quiz).not.toContain('Sua idade');
    expect(legacyExamsRoute).toContain('COALESCE(not_applicable, 0) = 0');
    expect(dashboardService.match(/COALESCE\(ue\.not_applicable, 0\) = 0/g)).toHaveLength(2);
    expect(collaboratorService).toContain('COALESCE(not_applicable, 0) = 0');
    expect(semaphoreCalculator).toContain('COALESCE(not_applicable, 0) = 0');
  });
});
