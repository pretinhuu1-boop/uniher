import { NextRequest, NextResponse } from 'next/server';

const MAX_BODY_SIZE = 1024 * 1024; // 1MB

export async function checkRequestSize(req: NextRequest): Promise<NextResponse | null> {
  const contentLength = parseInt(req.headers.get('content-length') || '0');
  if (contentLength > MAX_BODY_SIZE) {
    return NextResponse.json(
      { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large (max 1MB)' },
      { status: 413 }
    );
  }
  return null;
}
