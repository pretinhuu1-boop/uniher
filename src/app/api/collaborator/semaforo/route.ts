import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { SEMAFORO_PRIVATE_HEADERS, SEMAFORO_REVIEW_STATE } from '@/lib/semaforo/containment';

export const GET = withAuth(async () => NextResponse.json(
  SEMAFORO_REVIEW_STATE,
  { headers: SEMAFORO_PRIVATE_HEADERS },
));
