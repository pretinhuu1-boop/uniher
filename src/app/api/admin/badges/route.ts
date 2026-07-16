import { withMasterAdmin } from '@/lib/auth/middleware';
import { privacyReviewResponse } from '@/lib/privacy/api-response';

export const GET = withMasterAdmin(async () => privacyReviewResponse());
export const POST = withMasterAdmin(async () => privacyReviewResponse());
