export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerShutdownHandlers } = await import('@/lib/server/shutdown');
    registerShutdownHandlers();

    // Run agenda alerts check every 6 hours
    setInterval(async () => {
      try {
        const { sendUpcomingReminders } = await import('@/services/agenda-alerts.service');
        const sent = await sendUpcomingReminders();
        if (sent > 0) console.log(`[Agenda] ${sent} lembretes enviados`);
      } catch { /* non-critical */ }
    }, 6 * 60 * 60 * 1000);

    // Also run once on startup (after 30s delay to let DB initialize)
    setTimeout(async () => {
      try {
        const { sendUpcomingReminders } = await import('@/services/agenda-alerts.service');
        await sendUpcomingReminders();
      } catch { /* non-critical */ }
    }, 30_000);
  }
}
