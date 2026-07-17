import { withAuth } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const POST = withAuth(async () => privacyReviewResponse());
