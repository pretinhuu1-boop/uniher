export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { registerShutdownHandlers } = await import('@/lib/server/shutdown');
  registerShutdownHandlers();

  const g = globalThis as typeof globalThis & { __uniherJobsStarted?: boolean };
  if (g.__uniherJobsStarted) return;
  g.__uniherJobsStarted = true;

  // Run agenda alerts check every 15 minutes so reminders respect the scheduled hour.
  setInterval(async () => {
    try {
      const { sendUpcomingReminders } = await import('@/services/agenda-alerts.service');
      const { personalRemindersSent } = await sendUpcomingReminders();
      if (personalRemindersSent > 0) {
        console.log(`[Agenda] ${personalRemindersSent} lembretes enviados`);
      }
    } catch { /* non-critical */ }
  }, 15 * 60 * 1000);

  // Also run once on startup after a short delay to let DB initialize.
  setTimeout(async () => {
    try {
      const { sendUpcomingReminders } = await import('@/services/agenda-alerts.service');
      await sendUpcomingReminders();
    } catch { /* non-critical */ }
  }, 15_000);

  if (process.env.NODE_ENV !== 'production') {
    // Local-only DB backups must never be traced into production standalone output.
    setInterval(async () => {
      try {
        const { runDailyAutoBackupIfDue } = await import('@/services/auto-backup.service');
        const result = await runDailyAutoBackupIfDue();
        if (result.ran) {
          console.log(`[Backup] Auto-backup diario criado: ${result.backup}`);
        }
      } catch { /* non-critical */ }
    }, 5 * 60 * 1000);

    setTimeout(async () => {
      try {
        const { runDailyAutoBackupIfDue } = await import('@/services/auto-backup.service');
        const result = await runDailyAutoBackupIfDue();
        if (result.ran) {
          console.log(`[Backup] Auto-backup diario criado no startup: ${result.backup}`);
        }
      } catch { /* non-critical */ }
    }, 45_000);
  }
}
