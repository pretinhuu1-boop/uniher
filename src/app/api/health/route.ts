/**
 * GET /api/health - public liveness endpoint.
 * Rate limited: 30 req/min per IP.
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkPublicRateLimit } from '@/lib/security/rate-limit';

export async function GET(req: NextRequest) {
  try { await checkPublicRateLimit(req); } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}
