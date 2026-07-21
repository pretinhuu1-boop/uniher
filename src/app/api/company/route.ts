import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getCompanyById, type CompanyRow } from '@/repositories/company.repository';
import { getUserById } from '@/repositories/user.repository';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { toSafeUserProjection } from '@/lib/gamification/containment';
import { AppError, handleApiError } from '@/lib/errors';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';

export const GET = withAuth(async (_req: NextRequest, context) => {
  try {
    await initDb();
    const user = getUserById(context.auth.userId);
    if (!user?.company_id) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }
    const company = getCompanyById(user.company_id);
    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const db = getReadDb();
    const statsRow = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE company_id = ?) AS user_count,
        (SELECT COUNT(*) FROM departments WHERE company_id = ?) AS department_count,
        (SELECT COUNT(*) FROM campaigns WHERE company_id = ? AND status = 'active') AS missions_active
    `).get(user.company_id, user.company_id, user.company_id) as {
      user_count: number;
      department_count: number;
      missions_active: number;
    };

    const companyFeedSetting = db.prepare(
      'SELECT setting_value FROM company_settings WHERE company_id = ? AND setting_key = ? LIMIT 1'
    ).get(user.company_id, 'feed_company_enabled') as { setting_value?: string } | undefined;
    const feedCompanyEnabled = companyFeedSetting?.setting_value === '1';

    return NextResponse.json(toSafeUserProjection({
      company: {
        ...company,
        user_count: statsRow.user_count,
        department_count: statsRow.department_count,
        missions_active: statsRow.missions_active,
        feed_company_enabled: feedCompanyEnabled,
      },
    }));
  } catch (error) {
    return handleApiError(error);
  }
});

const UpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  tradeName: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(30).optional(),
  feedCompanyEnabled: z.boolean().optional(),
}).strict();

export const PATCH = withAuth(async (req: NextRequest, context) => {
  try {
    await initDb();
    if (context.auth.role !== 'rh' && context.auth.role !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão', code: 'FORBIDDEN' }, { status: 403 });
    }
    await checkWriteRateLimit(req, context.auth.userId);

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message, code: 'COMPANY_UPDATE_INVALID' },
        { status: 422 },
      );
    }

    const now = new Date().toISOString();
    const requestIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')?.trim()
      || null;
    const updated = await getWriteQueue().enqueue((db) => db.transaction(() => {
      const actor = db.prepare(`
        SELECT id, company_id, email, role
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
          AND COALESCE(blocked, 0) = 0
          AND COALESCE(approved, 0) = 1
      `).get(context.auth.userId) as {
        id: string;
        company_id: string | null;
        email: string;
        role: string;
      } | undefined;
      if (!actor || !['rh', 'admin'].includes(actor.role) || actor.role !== context.auth.role) {
        throw new AppError('Sem permissão', 403, 'FORBIDDEN');
      }
      if (!actor.company_id || actor.company_id !== context.auth.companyId) {
        throw new AppError('Empresa não encontrada', 404, 'COMPANY_NOT_FOUND');
      }
      const activeCompany = db.prepare(`
        SELECT id FROM companies
        WHERE id = ? AND COALESCE(is_active, 0) = 1 AND deleted_at IS NULL
      `).get(actor.company_id) as { id: string } | undefined;
      if (!activeCompany) throw new AppError('Empresa não encontrada', 404, 'COMPANY_NOT_FOUND');

      const fields: string[] = [];
      const values: unknown[] = [];
      const addField = (column: string, value: unknown) => {
        if (value === undefined) return;
        fields.push(`${column} = ?`);
        values.push(value);
      };
      addField('name', parsed.data.name);
      addField('trade_name', parsed.data.tradeName);
      addField('sector', parsed.data.sector);
      addField('logo_url', parsed.data.logoUrl ?? undefined);
      addField('primary_color', parsed.data.primaryColor ?? undefined);
      addField('secondary_color', parsed.data.secondaryColor ?? undefined);
      addField('contact_name', parsed.data.contactName);
      addField('contact_email', parsed.data.contactEmail);
      addField('contact_phone', parsed.data.contactPhone);
      if (fields.length > 0) {
        fields.push('updated_at = ?');
        values.push(now, actor.company_id);
        db.prepare(`UPDATE companies SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }

      if (parsed.data.feedCompanyEnabled !== undefined) {
        const currentSetting = db.prepare(`
          SELECT setting_value
          FROM company_settings
          WHERE company_id = ? AND setting_key = 'feed_company_enabled'
          LIMIT 1
        `).get(actor.company_id) as { setting_value: string } | undefined;
        const previousFeedEnabled = currentSetting?.setting_value === '1';
        const newFeedEnabled = parsed.data.feedCompanyEnabled;

        if (previousFeedEnabled !== newFeedEnabled) {
          db.prepare(`
            INSERT INTO company_settings (id, company_id, setting_key, setting_value, updated_at)
            VALUES (lower(hex(randomblob(16))), ?, 'feed_company_enabled', ?, ?)
            ON CONFLICT(company_id, setting_key)
            DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at
          `).run(actor.company_id, newFeedEnabled ? '1' : '0', now);
          db.prepare(`
            INSERT INTO audit_logs (
              id, actor_id, actor_email, actor_role, action, entity_type,
              entity_id, details, ip, created_at
            ) VALUES (
              lower(hex(randomblob(16))), ?, ?, ?,
              'company_community_feed_setting_update', 'company_setting', ?, ?, ?, ?
            )
          `).run(
            actor.id,
            actor.email,
            actor.role,
            actor.company_id,
            JSON.stringify({
              companyId: actor.company_id,
              previous: previousFeedEnabled,
              new: newFeedEnabled,
              timestamp: now,
            }),
            requestIp,
            now,
          );
        }
      }

      return db.prepare('SELECT * FROM companies WHERE id = ?').get(actor.company_id) as CompanyRow;
    })(), 'company-profile-update');

    return NextResponse.json({ company: toSafeUserProjection(updated) });
  } catch (error) {
    return handleApiError(error);
  }
});
