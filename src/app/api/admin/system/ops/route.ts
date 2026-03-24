import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { devOnlyGuard } from '@/lib/api/dev-only';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const POST = withRole('admin')(async (req: NextRequest) => {
  const blocked = devOnlyGuard();
  if (blocked) return blocked;

  const { action } = await req.json() as { action: string };
  const cwd = process.cwd();

  switch (action) {
    // ─── Read Logs ───
    case 'logs-server': {
      const p = path.join(cwd, 'data', 'server.log');
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        return NextResponse.json({ lines: lines.slice(-50), total: lines.length });
      } catch { return NextResponse.json({ lines: [], total: 0 }); }
    }
    case 'logs-errors': {
      const p = path.join(cwd, 'data', 'errors.log');
      try {
        const content = fs.readFileSync(p, 'utf-8');
        const lines = content.split('\n').filter(Boolean);
        return NextResponse.json({ lines: lines.slice(-50), total: lines.length });
      } catch { return NextResponse.json({ lines: [], total: 0 }); }
    }

    // ─── Ports ───
    case 'ports': {
      try {
        const raw = execSync('netstat -ano 2>nul', { encoding: 'utf-8', timeout: 5000 });
        const listening = raw.split('\n')
          .filter(l => l.includes('LISTENING'))
          .map(l => l.trim().split(/\s+/))
          .filter(p => p.length >= 5)
          .map(p => ({ address: p[1], pid: p[4] }))
          .filter(p => {
            const port = parseInt(p.address.split(':').pop() || '0');
            return port >= 3000 && port <= 65000;
          })
          .slice(0, 20);
        return NextResponse.json({ ports: listening });
      } catch { return NextResponse.json({ ports: [] }); }
    }

    // ─── Disk Usage ───
    case 'disk': {
      function dirSizeSync(dir: string, maxDepth = 3, depth = 0): number {
        if (depth > maxDepth) return 0;
        try {
          let total = 0;
          const items = fs.readdirSync(dir, { withFileTypes: true });
          for (const item of items) {
            const full = path.join(dir, item.name);
            try {
              if (item.isFile()) total += fs.statSync(full).size;
              else if (item.isDirectory() && !['node_modules', '.next', '.git'].includes(item.name)) {
                total += dirSizeSync(full, maxDepth, depth + 1);
              }
            } catch { /* skip */ }
          }
          return total;
        } catch { return 0; }
      }

      const sizes: Record<string, number> = {};
      sizes['data/'] = dirSizeSync(path.join(cwd, 'data'), 5);
      sizes['src/'] = dirSizeSync(path.join(cwd, 'src'), 5);
      sizes['public/'] = dirSizeSync(path.join(cwd, 'public'), 3);

      // .next and node_modules just check existence
      sizes['.next/'] = fs.existsSync(path.join(cwd, '.next')) ? -1 : 0;
      sizes['node_modules/'] = fs.existsSync(path.join(cwd, 'node_modules')) ? -1 : 0;

      // System disk
      let diskFreeGB = 0, diskTotalGB = 0;
      try {
        const raw = execSync('wmic logicaldisk get freespace,size /format:csv 2>nul', { encoding: 'utf-8', timeout: 5000 });
        const lines = raw.split('\n').filter(l => l.trim().length > 5);
        if (lines.length > 1) {
          const parts = lines[1].split(',');
          if (parts.length >= 3) {
            diskFreeGB = parseFloat(parts[1]) / 1024 / 1024 / 1024;
            diskTotalGB = parseFloat(parts[2]) / 1024 / 1024 / 1024;
          }
        }
      } catch { /* */ }

      return NextResponse.json({
        sizes: Object.fromEntries(
          Object.entries(sizes).map(([k, v]) => [k, v === -1 ? 'exists' : +(v / 1024 / 1024).toFixed(2)])
        ),
        disk: { freeGB: +diskFreeGB.toFixed(1), totalGB: +diskTotalGB.toFixed(1) },
      });
    }

    // ─── Clear Cache ───
    case 'clear-cache': {
      try {
        const nextDir = path.join(cwd, '.next');
        if (fs.existsSync(nextDir)) {
          fs.rmSync(nextDir, { recursive: true, force: true });
        }
        return NextResponse.json({ success: true, message: 'Cache .next removido' });
      } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message });
      }
    }

    // ─── Reset DB ───
    case 'reset-db': {
      try {
        // Close current connection first
        const { closeDb } = require('@/lib/db');
        closeDb();

        const dbPath = process.env.DATABASE_PATH || path.join(cwd, 'data', 'uniher.db');

        // Backup before reset
        const backupsDir = path.join(cwd, 'data', 'backups');
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
        if (fs.existsSync(dbPath)) {
          const now = new Date();
          const name = `uniher-pre-reset-${now.toISOString().replace(/[:.]/g, '-')}.db`;
          fs.copyFileSync(dbPath, path.join(backupsDir, name));
          fs.unlinkSync(dbPath);
          try { fs.unlinkSync(dbPath + '-wal'); } catch { /* */ }
          try { fs.unlinkSync(dbPath + '-shm'); } catch { /* */ }
        }

        // Re-seed
        execSync('npm run db:seed', { cwd, encoding: 'utf-8', timeout: 30000 });

        return NextResponse.json({ success: true, message: 'Banco resetado com sucesso (backup criado)' });
      } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message });
      }
    }

    // ─── Restart Server ───
    case 'restart': {
      // Respond first, then exit — watchdog will restart
      setTimeout(() => {
        console.log('[UniHER] Restart requested via control panel');
        process.exit(0);
      }, 500);
      return NextResponse.json({ success: true, message: 'Servidor reiniciando...' });
    }

    // ─── Full System Info ───
    case 'system-info': {
      const cpus = os.cpus();
      const networkInterfaces = os.networkInterfaces();
      const ips: string[] = [];
      for (const iface of Object.values(networkInterfaces)) {
        if (!iface) continue;
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address);
        }
      }

      return NextResponse.json({
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        osRelease: os.release(),
        osType: os.type(),
        cpu: cpus[0]?.model || 'Unknown',
        cpuCores: cpus.length,
        totalMemGB: +(os.totalmem() / 1024 / 1024 / 1024).toFixed(1),
        freeMemGB: +(os.freemem() / 1024 / 1024 / 1024).toFixed(1),
        nodeVersion: process.version,
        uptime: os.uptime(),
        processUptime: process.uptime(),
        ips,
        cwd: process.cwd(),
        env: process.env.NODE_ENV || 'development',
      });
    }

    default:
      return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  }
});
