import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getCompanyById, updateCompany } from '@/repositories/company.repository';
import { getUserById } from '@/repositories/user.repository';
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
  return NextResponse.json({ company });
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

  return NextResponse.json({ company: updated });
});
