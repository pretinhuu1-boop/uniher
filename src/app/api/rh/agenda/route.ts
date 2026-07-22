import { withRole } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const GET = withRole('rh', 'lideranca', 'admin')(async () =>
  privacyReviewResponse(),
);
