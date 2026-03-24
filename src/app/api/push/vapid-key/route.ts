import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit } from '@/lib/security/rate-limit';

/** GET — Returns the public VAPID key (or enabled: false if not configured) */
export async function GET(req: NextRequest) {
  try { await checkPublicRateLimit(req); } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ enabled: false });
  }
  return NextResponse.json({ enabled: true, publicKey });
}
