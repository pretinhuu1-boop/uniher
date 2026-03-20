import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { refresh } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';

export async function POST() {
  try {
    await initDb();
    const result = await refresh();
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
