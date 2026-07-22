import { NextResponse } from 'next/server';

export const PRIVACY_REVIEW_BODY = {
  status: 'unavailable',
  reason: 'privacy_review',
  message:
    'Recurso temporariamente indisponível durante a revisão de privacidade.',
} as const;

export function privacyReviewResponse(status = 410) {
  return NextResponse.json(PRIVACY_REVIEW_BODY, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
    },
  });
}
