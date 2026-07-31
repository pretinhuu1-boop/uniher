import { NextRequest, NextResponse } from 'next/server';
import { getReadDb } from '@/lib/db';
import { checkPublicRateLimit } from '@/lib/security/rate-limit';

function healthResponse(status: 'healthy' | 'degraded', statusCode: number) {
  return NextResponse.json(
    { status },
    {
      status: statusCode,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function GET(req: NextRequest) {
  try {
    await checkPublicRateLimit(req);
  } catch {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }

  try {
    getReadDb().prepare('SELECT 1').get();
    return healthResponse('healthy', 200);
  } catch {
    return healthResponse('degraded', 503);
  }
}
