import { getWriteQueue, getReadDb } from '@/lib/db';
import { nanoid } from 'nanoid';

export type AuditAction =
  // Master / Admin actions
  | 'login' | 'logout' | 'first_access_password_change'
  | 'user_create' | 'user_edit' | 'user_block' | 'user_unblock' | 'password_reset'
  | 'company_create' | 'company_edit' | 'company_block' | 'company_unblock'
  | 'system_settings_update'
  // User actions (all roles)
  | 'profile_update' | 'quiz_submit' | 'challenge_complete' | 'challenge_create'
  | 'campaign_join' | 'badge_unlock' | 'invite_sent' | 'invite_approved';

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

function buildDateFilter(filters: AuditFilters): string {
  if (filters.period === 'day') return "AND created_at >= datetime('now', '-1 day')";
  if (filters.period === 'week') return "AND created_at >= datetime('now', '-7 days')";
  if (filters.period === 'month') return "AND created_at >= datetime('now', '-30 days')";
  if (filters.period === 'custom' && filters.from && filters.to)
    return `AND created_at >= '${filters.from}' AND created_at <= '${filters.to} 23:59:59'`;
  return "AND created_at >= datetime('now', '-90 days')";
}

function buildWhere(filters: AuditFilters): string {
  const date = buildDateFilter(filters);
  const action = filters.action ? `AND action = '${filters.action.replace(/'/g, "''")}'` : '';
  const search = filters.search
    ? `AND (actor_email LIKE '%${filters.search.replace(/'/g, "''")}%'
         OR entity_label LIKE '%${filters.search.replace(/'/g, "''")}%'
         OR details LIKE '%${filters.search.replace(/'/g, "''")}%'
         OR actor_role LIKE '%${filters.search.replace(/'/g, "''")}%'
         OR action LIKE '%${filters.search.replace(/'/g, "''")}%')`
    : '';
  return `WHERE 1=1 ${date} ${action} ${search}`;
}

export function queryAuditLogs(filters: AuditFilters = {}): AuditEntry[] {
  const db = getReadDb();
  const limit = filters.limit ?? 100;
  const offset = filters.offset ?? 0;
  return db.prepare(`
    SELECT * FROM audit_logs
    ${buildWhere(filters)}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `).all() as AuditEntry[];
}

export function countAuditLogs(filters: AuditFilters = {}): number {
  const db = getReadDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM audit_logs
    ${buildWhere(filters)}
  `).get() as { count: number };
  return row.count;
}
