import { withMasterAdmin } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const PATCH = withMasterAdmin(async () => privacyReviewResponse());
export const DELETE = withMasterAdmin(async () => privacyReviewResponse());
