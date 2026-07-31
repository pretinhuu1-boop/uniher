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
    const semaforoPage = readFileSync(semaforoPagePath, 'utf8');
    const sidebar = readFileSync(sidebarPath, 'utf8');
    const quiz = readFileSync(quizPath, 'utf8');
    const legacyExamsRoute = readFileSync(legacyExamsRoutePath, 'utf8');
    const dashboardService = readFileSync(dashboardServicePath, 'utf8');
    const collaboratorService = readFileSync(collaboratorServicePath, 'utf8');

    expect(semaforoPage).toContain('ExamSemaphoreQuiz');
    expect(sidebar.match(/href: '\/semaforo'/g)).toHaveLength(1);
    expect(sidebar).toContain("label: 'Meu Semaforo'");
    expect(sidebar).not.toContain("label: 'Semaforo da Equipe'");
    expect(sidebar).not.toContain("label: 'Semaforo de Saude'");
    expect(sidebar).not.toContain("href: '/health-checkin'");
    expect(existsSync(parallelPagePath)).toBe(false);
    expect(quiz).toContain("fetch('/api/collaborator/health-checkin')");
    expect(quiz).toContain('type="date"');
    expect(quiz).not.toContain('type="number"');
    expect(quiz).not.toContain('Sua idade');
    expect(legacyExamsRoute).toContain('COALESCE(not_applicable, 0) = 0');
    expect(legacyExamsRoute).not.toContain('recalculateSemaforo');
    expect(dashboardService.match(/COALESCE\(ue\.not_applicable, 0\) = 0/g)).toHaveLength(2);
    expect(collaboratorService).toContain('COALESCE(not_applicable, 0) = 0');
  });

  it('retires the six-dimension Semaforo runtime without deleting archived data', () => {
    const removedPaths = [
      'src/services/semaforo-calculator.service.ts',
      'src/repositories/health-score.repository.ts',
      'src/app/api/collaborator/semaforo/route.ts',
      'src/app/api/collaborator/semaforo/history/route.ts',
      'src/app/api/collaborator/semaforo/recalculate/route.ts',
    ];

    for (const relativePath of removedPaths) {
      expect(existsSync(path.join(process.cwd(), relativePath)), relativePath).toBe(false);
    }

    const activeFiles = [
      'src/app/(platform)/colaboradora/page.tsx',
      'src/app/(platform)/conquistas/page.tsx',
      'src/app/(platform)/configuracoes/page.tsx',
      'src/app/api/collaborator/exams/route.ts',
      'src/app/api/dashboard/route.ts',
      'src/app/api/gamification/daily-missions/[id]/complete/route.ts',
      'src/app/api/quiz/submit/route.ts',
      'src/app/api/users/me/notification-preferences/route.ts',
      'src/components/platform/ReminderPopup.tsx',
      'src/components/platform/SidebarNavItem.tsx',
      'src/hooks/useDashboard.ts',
      'src/lib/quiz/engine.ts',
      'src/services/collaborator.service.ts',
      'src/services/daily-missions.service.ts',
      'src/services/dashboard.service.ts',
      'src/services/gamification.service.ts',
      'src/types/platform.ts',
    ].map((relativePath) => readFileSync(path.join(process.cwd(), relativePath), 'utf8'));

    const activeRuntime = activeFiles.join('\n');
    expect(activeRuntime).not.toContain('/api/collaborator/semaforo');
    expect(activeRuntime).not.toContain('health_scores');
    expect(activeRuntime).not.toContain('healthRisk');
    expect(activeRuntime).not.toContain('HealthRisk');
    expect(activeRuntime).not.toContain('update_semaforo');
    expect(activeRuntime).not.toContain('calculateInitialHealthScore');

    const collaboratorService = readFileSync(
      path.join(process.cwd(), 'src/services/collaborator.service.ts'),
      'utf8'
    );
    const gamificationService = readFileSync(
      path.join(process.cwd(), 'src/services/gamification.service.ts'),
      'utf8'
    );
    expect(collaboratorService).toContain("RETIRED_BADGE_IDS = new Set(['badge_equilibrio'])");
    expect(gamificationService).not.toContain('badge_equilibrio');

    const initialMigration = readFileSync(
      path.join(process.cwd(), 'src/lib/db/migrations/001_initial.sql'),
      'utf8'
    );
    const dataExport = readFileSync(
      path.join(process.cwd(), 'src/app/api/users/me/export/route.ts'),
      'utf8'
    );
    expect(initialMigration).toContain('CREATE TABLE IF NOT EXISTS health_scores');
    expect(dataExport).toContain('legacyHealthScores');
  });

  it('keeps the daily check-in mood contract aligned with the collaborator UI', () => {
    const collaboratorPage = readFileSync(
      path.join(process.cwd(), 'src/app/(platform)/colaboradora/page.tsx'),
      'utf8'
    );
    const missionRoute = readFileSync(
      path.join(process.cwd(), 'src/app/api/gamification/daily-missions/[id]/complete/route.ts'),
      'utf8'
    );

    for (const mood of ['tired', 'ok', 'good', 'great']) {
      expect(collaboratorPage).toContain(`key: '${mood}'`);
      expect(missionRoute).toContain(`'${mood}'`);
    }
  });
});
