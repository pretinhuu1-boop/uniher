import { NextResponse } from 'next/server';

export function apiSuccess(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json({ success: false, error: message, code: code || 'ERROR' }, { status });
}
