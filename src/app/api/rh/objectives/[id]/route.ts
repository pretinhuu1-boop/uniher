import { withRole } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const PATCH = withRole('rh', 'admin')(async () => privacyReviewResponse());
export const DELETE = withRole('rh', 'admin')(async () => privacyReviewResponse());
