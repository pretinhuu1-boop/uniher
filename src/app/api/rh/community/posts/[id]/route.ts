import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withRole } from '@/lib/auth/middleware';
import { communityApiErrorResponse, communityQuery } from '@/lib/community/api';
import {
  getEditorialPost,
  patchEditorialPost,
} from '@/lib/community/editorial';
import { communityPostPatchSchema } from '@/lib/community/schemas';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';

const targetQuerySchema = z.object({
  companyId: z.string().trim().min(1).optional(),
}).strict();

function parseTargetQuery(req: NextRequest): { companyId?: string } | NextResponse {
  const parsed = targetQuerySchema.safeParse(communityQuery(req));
  if (parsed.success) return parsed.data;
  return NextResponse.json(
    { error: 'Invalid editorial query', code: 'COMMUNITY_QUERY_INVALID' },
    { status: 422 },
  );
}

function invalidPostResponse(error?: z.ZodError) {
  return NextResponse.json(
    {
      error: 'Invalid community post',
      code: 'COMMUNITY_POST_INVALID',
      ...(error ? { details: error.issues } : {}),
    },
    { status: 422 },
  );
}

export const GET = withRole('rh', 'admin')(async (req: NextRequest, { auth, params }) => {
  try {
    await initDb();
    const target = parseTargetQuery(req);
    if (target instanceof NextResponse) return target;
    const { id } = await params;
    return NextResponse.json(getEditorialPost(getReadDb(), auth, id, target.companyId));
  } catch (error) {
    return communityApiErrorResponse(error);
  }
});

export const PATCH = withRole('rh', 'admin')(async (req: NextRequest, { auth, params }) => {
  try {
    await initDb();
    await checkWriteRateLimit(req, auth.userId);
    const target = parseTargetQuery(req);
    if (target instanceof NextResponse) return target;
    const raw = await req.json().catch(() => null);
    const parsed = communityPostPatchSchema.safeParse(raw);
    if (!parsed.success) return invalidPostResponse(parsed.error);
    const { id } = await params;
    const result = await getWriteQueue().enqueue((database) => patchEditorialPost(
      database,
      auth,
      id,
      target.companyId,
      parsed.data,
      new Date().toISOString(),
    ), 'community-post-update');
    return NextResponse.json(result);
  } catch (error) {
    return communityApiErrorResponse(error);
  }
});
