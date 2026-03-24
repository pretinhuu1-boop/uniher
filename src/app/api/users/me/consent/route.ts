import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const VALID_CONSENT_TYPES = ['terms', 'privacy', 'data_processing', 'email_marketing'] as const;

const consentSchema = z.object({
  consentType: z.enum(VALID_CONSENT_TYPES),
  granted: z.boolean(),
});

const revokeSchema = z.object({
  consentType: z.enum(VALID_CONSENT_TYPES),
});

/** GET: list all consent records for authenticated user */
export const GET = withAuth(async (_req: NextRequest, context) => {
  const db = getReadDb();
  const consents = db.prepare(
    'SELECT id, consent_type, granted, ip_address, user_agent, granted_at, revoked_at FROM user_consents WHERE user_id = ? ORDER BY granted_at DESC'
  ).all(context.auth.userId);

  return NextResponse.json({ consents });
});

/** POST: record a new consent */
export const POST = withAuth(async (req: NextRequest, context) => {
  const body = await req.json();
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const { consentType, granted } = parsed.data;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || '';

  const writeQueue = getWriteQueue();
  const id = nanoid();

  await writeQueue.enqueue((db) => {
    // Revoke any existing active consent of the same type
    db.prepare(
      "UPDATE user_consents SET revoked_at = datetime('now') WHERE user_id = ? AND consent_type = ? AND revoked_at IS NULL"
    ).run(context.auth.userId, consentType);

    // Insert new consent record
    db.prepare(
      'INSERT INTO user_consents (id, user_id, consent_type, granted, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, context.auth.userId, consentType, granted ? 1 : 0, ip, userAgent);
  });

  return NextResponse.json({ id, consentType, granted }, { status: 201 });
});

/** DELETE: revoke a consent */
export const DELETE = withAuth(async (req: NextRequest, context) => {
  const body = await req.json();
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const { consentType } = parsed.data;
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    db.prepare(
      "UPDATE user_consents SET revoked_at = datetime('now') WHERE user_id = ? AND consent_type = ? AND revoked_at IS NULL"
    ).run(context.auth.userId, consentType);
  });

  return NextResponse.json({ message: 'Consentimento revogado com sucesso' });
});
