import { withRole } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const PATCH = withRole('rh')(async () => privacyReviewResponse());
export const DELETE = withRole('rh')(async () => privacyReviewResponse());
