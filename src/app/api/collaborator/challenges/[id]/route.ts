import { withAuth } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const PATCH = withAuth(async () => privacyReviewResponse());
