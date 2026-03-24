import { NextResponse } from 'next/server';

/**
 * Guard: rejects requests in production.
 * System management endpoints must only work on localhost/development.
 */
export function devOnlyGuard(): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint disponível apenas em desenvolvimento' },
      { status: 403 }
    );
  }
  return null;
}
