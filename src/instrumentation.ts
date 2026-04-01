export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerShutdownHandlers } = await import('@/lib/server/shutdown');
    registerShutdownHandlers();

    const g = globalThis as typeof globalThis & { __uniherJobsStarted?: boolean };
    if (g.__uniherJobsStarted) return;
    g.__uniherJobsStarted = true;

    // Run agenda alerts check every 15 minutes so reminders respect the scheduled hour.
    setInterval(async () => {
      try {
        const { sendUpcomingReminders } = await import('@/services/agenda-alerts.service');
        const sent = await sendUpcomingReminders();
        if (sent > 0) console.log(`[Agenda] ${sent} lembretes enviados`);
      } catch { /* non-critical */ }
    }, 15 * 60 * 1000);

    // Also run once on startup (after 15s delay to let DB initialize)
    setTimeout(async () => {
      try {
        const { sendUpcomingReminders } = await import('@/services/agenda-alerts.service');
        await sendUpcomingReminders();
      } catch { /* non-critical */ }
    }, 15_000);

    // Auto-backup scheduler: checks every 5 min; runs once/day around 02:00
    setInterval(async () => {
      try {
        const { runDailyAutoBackupIfDue } = await import('@/services/auto-backup.service');
        const result = await runDailyAutoBackupIfDue();
        if (result.ran) {
          console.log(`[Backup] Auto-backup diário criado: ${result.backup}`);
        }
      } catch { /* non-critical */ }
    }, 5 * 60 * 1000);

    // Startup check (in case server starts around 02:00)
    setTimeout(async () => {
      try {
        const { runDailyAutoBackupIfDue } = await import('@/services/auto-backup.service');
        const result = await runDailyAutoBackupIfDue();
        if (result.ran) {
          console.log(`[Backup] Auto-backup diário criado no startup: ${result.backup}`);
        }
      } catch { /* non-critical */ }
    }, 45_000);
  }
}
