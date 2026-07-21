import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { withRole } from '@/lib/auth/middleware';
import { communityPostCreateSchema } from '@/lib/community/schemas';
import { communityApiErrorResponse, communityQuery } from '@/lib/community/api';
import {
  createEditorialPost,
  listEditorialPosts,
} from '@/lib/community/editorial';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { checkWriteRateLimit } from '@/lib/security/rate-limit';

const listQuerySchema = z.object({
  companyId: z.string().trim().min(1).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
}).strict();

function invalidPostResponse(error?: ZodError) {
  return NextResponse.json(
    {
      error: 'Invalid community post',
      code: 'COMMUNITY_POST_INVALID',
      ...(error ? { details: error.issues } : {}),
    },
    { status: 422 },
  );
}

export const GET = withRole('rh', 'admin')(async (req, { auth }) => {
  try {
    await initDb();
    const parsed = listQuerySchema.safeParse(communityQuery(req));
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid editorial query', code: 'COMMUNITY_QUERY_INVALID' },
        { status: 422 },
      );
    }
    return NextResponse.json(listEditorialPosts(
      getReadDb(),
      auth,
      parsed.data.companyId,
      parsed.data.status,
    ));
  } catch (error) {
    return communityApiErrorResponse(error);
  }
});

export const POST = withRole('rh', 'admin')(async (req: NextRequest, { auth }) => {
  try {
    await initDb();
    await checkWriteRateLimit(req, auth.userId);
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalidPostResponse();

    const { companyId, ...postInput } = raw as Record<string, unknown>;
    if (companyId !== undefined && typeof companyId !== 'string') return invalidPostResponse();
    const parsed = communityPostCreateSchema.safeParse(postInput);
    if (!parsed.success) return invalidPostResponse(parsed.error);

    const result = await getWriteQueue().enqueue((database) => createEditorialPost(
      database,
      auth,
      companyId as string | undefined,
      parsed.data,
      new Date().toISOString(),
    ), 'community-post-create');
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return invalidPostResponse(error);
    return communityApiErrorResponse(error);
  }
});
