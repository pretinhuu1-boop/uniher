import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getCompanyById, updateCompany } from '@/repositories/company.repository';
import { getUserById } from '@/repositories/user.repository';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';

export const GET = withAuth(async (_req: NextRequest, context) => {
  await initDb();
  const user = getUserById(context.auth.userId);
  if (!user?.company_id) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  }
  const company = getCompanyById(user.company_id);
  if (!company) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  }

  // Fetch additional stats
  const db = getReadDb();
  const statsRow = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE company_id = ?) AS user_count,
      (SELECT COUNT(*) FROM departments WHERE company_id = ?) AS department_count,
      (SELECT COALESCE(SUM(points), 0) FROM users WHERE company_id = ?) AS total_points,
      (SELECT COUNT(*) FROM campaigns WHERE company_id = ? AND status = 'active') AS missions_active
  `).get(user.company_id, user.company_id, user.company_id, user.company_id) as {
    user_count: number;
    department_count: number;
    total_points: number;
    missions_active: number;
  };

  const companyFeedSetting = db.prepare(
    'SELECT setting_value FROM company_settings WHERE company_id = ? AND setting_key = ? LIMIT 1'
  ).get(user.company_id, 'feed_company_enabled') as { setting_value?: string } | undefined;
  const feedCompanyEnabled = companyFeedSetting ? companyFeedSetting.setting_value === '1' : true;

  return NextResponse.json({
    company: {
      ...company,
      user_count: statsRow.user_count,
      department_count: statsRow.department_count,
      total_points: statsRow.total_points,
      missions_active: statsRow.missions_active,
      feed_company_enabled: feedCompanyEnabled,
    },
  });
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
});

export const PATCH = withAuth(async (req: NextRequest, context) => {
  await initDb();
  if (context.auth.role !== 'rh' && context.auth.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const user = getUserById(context.auth.userId);
  if (!user?.company_id) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const updated = await updateCompany(user.company_id, {
    name: parsed.data.name,
    tradeName: parsed.data.tradeName,
    sector: parsed.data.sector,
    logoUrl: parsed.data.logoUrl ?? undefined,
    primaryColor: parsed.data.primaryColor ?? undefined,
    secondaryColor: parsed.data.secondaryColor ?? undefined,
    contactName: parsed.data.contactName,
    contactEmail: parsed.data.contactEmail,
    contactPhone: parsed.data.contactPhone,
  });

  if (parsed.data.feedCompanyEnabled !== undefined) {
    const db = getReadDb();
    db.prepare(`
      INSERT INTO company_settings (id, company_id, setting_key, setting_value, updated_at)
      VALUES (lower(hex(randomblob(16))), ?, 'feed_company_enabled', ?, datetime('now'))
      ON CONFLICT(company_id, setting_key)
      DO UPDATE SET setting_value = excluded.setting_value, updated_at = datetime('now')
    `).run(user.company_id, parsed.data.feedCompanyEnabled ? '1' : '0');
  }

  return NextResponse.json({ company: updated });
});
