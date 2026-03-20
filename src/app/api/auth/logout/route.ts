import { NextResponse } from 'next/server';
import { initDb } from '@/lib/db/init';
import { logout } from '@/services/auth.service';
import { handleApiError } from '@/lib/errors';

export async function POST() {
  try {
    await initDb();
    await logout();
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
