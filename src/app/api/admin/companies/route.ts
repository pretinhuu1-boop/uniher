import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { listAllCompanies, createCompany } from '@/repositories/company.repository';
import { getReadDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { logAudit } from '@/lib/audit';

const CreateSchema = z.object({
  name: z.string().min(2).max(120),
  trade_name: z.string().max(120).optional(),
  cnpj: z.string().min(14).max(18),
  sector: z.string().max(80).optional(),
  plan: z.enum(['trial', 'pro', 'enterprise']).default('trial'),
  contact_name: z.string().max(100).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().max(20).optional(),
});

export const GET = withRole('admin')(async (req: NextRequest) => {
  await initDb();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  const db = getReadDb();
  const total = (db.prepare('SELECT COUNT(*) as cnt FROM companies WHERE deleted_at IS NULL').get() as { cnt: number }).cnt;
  const companies = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.deleted_at IS NULL) AS user_count,
      (SELECT COUNT(*) FROM departments d WHERE d.company_id = c.id) AS department_count
    FROM companies c
    WHERE c.deleted_at IS NULL
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  return NextResponse.json({ companies, total, limit, offset });
});

export const POST = withRole('admin')(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }
  const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim();
  const { cnpj, sector, plan, contact_name, contact_email, contact_phone } = parsed.data;
  const name = stripHtml(parsed.data.name);
  const trade_name = parsed.data.trade_name ? stripHtml(parsed.data.trade_name) : undefined;

  if (!name) {
    return NextResponse.json({ error: 'Nome da empresa é obrigatório' }, { status: 422 });
  }

  try {
    const company = await createCompany({
      name, tradeName: trade_name, cnpj, sector, plan,
      contactName: contact_name, contactEmail: contact_email, contactPhone: contact_phone,
    });
    await logAudit({
      actorId: context.auth.userId,
      actorEmail: context.auth.userId,
      actorRole: context.auth.role,
      action: 'company_create',
      entityType: 'company',
      entityId: company.id,
      entityLabel: trade_name ?? name,
      details: { cnpj, plan: plan ?? 'trial' },
      ip: req.headers.get('x-forwarded-for') ?? undefined,
    });
    return NextResponse.json({ success: true, company });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('UNIQUE')) return NextResponse.json({ error: 'CNPJ já cadastrado' }, { status: 409 });
    throw e;
  }
});
