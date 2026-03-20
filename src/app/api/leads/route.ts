import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { leadSchema } from '@/lib/validation/schemas';
import { handleApiError } from '@/lib/errors';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';
import * as leadRepo from '@/repositories/lead.repository';

// POST /api/leads - capturar lead do quiz publico (sem auth)
export async function POST(req: Request) {
  try {
    await initDb();
    await checkWriteRateLimit(req);

    const body = await req.json();
    const input = leadSchema.parse(body);

    const lead = await leadRepo.createLead(input);

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    return handleApiError(error);
  }
}
