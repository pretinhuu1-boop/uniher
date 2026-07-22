import { withAuth, withRole } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const GET = withAuth(async () => privacyReviewResponse());
export const POST = withRole('admin', 'rh')(async () => privacyReviewResponse());
