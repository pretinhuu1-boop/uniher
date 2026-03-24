import { getWriteQueue, getReadDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export type AuditAction =
  // Master / Admin actions
  | 'login' | 'login_failed' | 'logout' | 'first_access_password_change'
  | 'user_create' | 'user_edit' | 'user_block' | 'user_unblock' | 'user_delete' | 'password_reset'
  | 'company_create' | 'company_edit' | 'company_block' | 'company_unblock' | 'company_delete'
  | 'system_settings_update'
  // User actions (all roles)
  | 'profile_update' | 'quiz_submit' | 'challenge_complete' | 'challenge_create'
  | 'campaign_join' | 'badge_unlock' | 'invite_sent' | 'invite_approved'
  | 'objective_create' | 'objective_update' | 'objective_delete';

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string;
  actor_role: string;
  action: AuditAction;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export async function logAudit(params: {
  actorId: string | null;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  const wq = getWriteQueue();
  await wq.enqueue((db) => {
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, entity_type, entity_id, entity_label, details, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nanoid(),
      params.actorId ?? null,
      params.actorEmail,
      params.actorRole,
      params.action,
      params.entityType ?? null,
      params.entityId ?? null,
      params.entityLabel ?? null,
      params.details ? JSON.stringify(params.details) : null,
      params.ip ?? null,
    );
  });
}

export interface AuditFilters {
  period?: 'day' | 'week' | 'month' | 'custom';
  from?: string;
  to?: string;
  action?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/** Build parameterized WHERE conditions (prevents SQL injection) */
function buildConditions(filters: AuditFilters): { conditions: string[]; params: unknown[] } {
  const conditions: string[] = ['1=1'];
  const params: unknown[] = [];

  // Date filter
  if (filters.period) {
    switch (filters.period) {
      case 'day': conditions.push("created_at >= datetime('now', '-1 day')"); break;
      case 'week': conditions.push("created_at >= datetime('now', '-7 days')"); break;
      case 'month': conditions.push("created_at >= datetime('now', '-30 days')"); break;
      case 'custom':
        if (filters.from) { conditions.push('created_at >= ?'); params.push(filters.from); }
        if (filters.to) { conditions.push('created_at <= ? || \' 23:59:59\''); params.push(filters.to); }
        break;
    }
  } else {
    conditions.push("created_at >= datetime('now', '-90 days')");
  }

  // Action filter
  if (filters.action) { conditions.push('action = ?'); params.push(filters.action); }

  // Search filter
  if (filters.search) {
    conditions.push('(actor_email LIKE ? OR entity_label LIKE ? OR details LIKE ? OR actor_role LIKE ? OR action LIKE ?)');
    const searchParam = `%${filters.search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
  }

  return { conditions, params };
}

export function queryAuditLogs(filters: AuditFilters = {}): AuditEntry[] {
  const db = getReadDb();
  const { conditions, params } = buildConditions(filters);

  const limit = Math.min(Math.max(1, filters.limit ?? 100), 500);
  const offset = Math.max(0, filters.offset ?? 0);

  const query = `SELECT * FROM audit_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return db.prepare(query).all(...params) as AuditEntry[];
}

export function countAuditLogs(filters: AuditFilters = {}): number {
  const db = getReadDb();
  const { conditions, params } = buildConditions(filters);

  const query = `SELECT COUNT(*) as count FROM audit_logs WHERE ${conditions.join(' AND ')}`;
  const row = db.prepare(query).get(...params) as { count: number };
  return row.count;
}
