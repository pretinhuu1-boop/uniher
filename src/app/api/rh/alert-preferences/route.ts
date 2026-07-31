/**
 * GET /api/rh/alert-preferences — preferências de alerta do gestor
 * PATCH /api/rh/alert-preferences — atualiza preferências
 */
import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  runAsActiveCompanyActor,
  runAsActiveRhActor,
} from '@/lib/security/active-rh-actor';
import { nanoid } from 'nanoid';

export const GET = withRole('rh', 'lideranca', 'admin')(async (_req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;

  const prefs = db.prepare(`
    SELECT alert_type, days_before, enabled
    FROM alert_preferences
    WHERE user_id = ?
  `).all(userId);

  // Return defaults if none set
  if (prefs.length === 0) {
    return NextResponse.json({
      preferences: [
        { alert_type: 'exame', days_before: 3, enabled: 1 },
        { alert_type: 'consulta', days_before: 3, enabled: 1 },
        { alert_type: 'lembrete', days_before: 1, enabled: 0 },
      ]
    });
  }

  return NextResponse.json({ preferences: prefs });
});

export const PATCH = withRole('rh', 'lideranca', 'admin')(async (req: NextRequest, context: any) => {
  await initDb();
  const userId = context.auth.userId;
  const companyId = context.auth.companyId;
  if (!companyId) {
    return NextResponse.json({ error: 'Usuário não vinculado a empresa ativa' }, { status: 400 });
  }
  const body = await req.json();

  const { alert_type, days_before, enabled } = body;

  if (!alert_type || !['exame', 'consulta', 'lembrete', 'all'].includes(alert_type)) {
    return NextResponse.json({ error: 'Tipo de alerta inválido' }, { status: 400 });
  }

  if (days_before !== undefined && (days_before < 0 || days_before > 30)) {
    return NextResponse.json({ error: 'Dias deve ser entre 0 e 30' }, { status: 400 });
  }

  const writeQueue = getWriteQueue();
  const outcome = await writeQueue.enqueue((db) => {
    const operation = () => {
      const existing = db.prepare(`
        SELECT id
        FROM alert_preferences
        WHERE user_id = ? AND alert_type = ?
      `).get(userId, alert_type);

      if (existing) {
        const updates: string[] = ["updated_at = datetime('now')"];
        const values: unknown[] = [];

        if (days_before !== undefined) {
          updates.push('days_before = ?');
          values.push(days_before);
        }
        if (enabled !== undefined) {
          updates.push('enabled = ?');
          values.push(enabled ? 1 : 0);
        }

        db.prepare(`
          UPDATE alert_preferences
          SET ${updates.join(', ')}
          WHERE user_id = ? AND alert_type = ?
        `).run(...values, userId, alert_type);
      } else {
        db.prepare(`
          INSERT INTO alert_preferences (id, user_id, alert_type, days_before, enabled)
          VALUES (?, ?, ?, ?, ?)
        `).run(nanoid(), userId, alert_type, days_before ?? 3, enabled !== undefined ? (enabled ? 1 : 0) : 1);
      }
      return true;
    };

    return context.auth.role === 'rh'
      ? runAsActiveRhActor(db, userId, companyId, operation)
      : runAsActiveCompanyActor(db, userId, companyId, ['lideranca', 'admin'], operation);
  }, 'update management alert preferences', { retryOnFailure: false });

  if (!outcome.authorized) {
    return NextResponse.json({ error: 'Autorização de gestão expirou' }, { status: 409 });
  }

  return NextResponse.json({ success: true });
});
