import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { listAllCompanies, createCompany } from '@/repositories/company.repository';
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

export const GET = withRole('admin')(async (_req: NextRequest) => {
  await initDb();
  const companies = listAllCompanies();
  return NextResponse.json({ companies });
});

export const POST = withRole('admin')(async (req: NextRequest, context) => {
  await initDb();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }
  const { name, trade_name, cnpj, sector, plan, contact_name, contact_email, contact_phone } = parsed.data;

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
