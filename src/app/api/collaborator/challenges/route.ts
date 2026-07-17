import { withAuth } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const GET = withAuth(async () => privacyReviewResponse());
export const POST = withAuth(async () => privacyReviewResponse());
export const PATCH = withAuth(async () => privacyReviewResponse());
