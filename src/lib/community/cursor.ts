import { z } from 'zod';

const nonEmptyString = z.string().trim().min(1);
const feedCursorSchema = z.tuple([nonEmptyString, nonEmptyString, nonEmptyString]);
const supporterCursorSchema = z.tuple([nonEmptyString, nonEmptyString]);
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

export type CommunityFeedCursor = readonly [publishedAt: string, createdAt: string, id: string];
export type CommunitySupporterCursor = readonly [createdAt: string, userId: string];

function encodeCursor(tuple: readonly string[]): string {
  return Buffer.from(JSON.stringify(tuple), 'utf8').toString('base64url');
}

function decodeCanonicalCursor<T extends readonly string[]>(
  encoded: string,
  schema: z.ZodType<T>,
): T {
  if (!base64UrlPattern.test(encoded)) throw new Error('Invalid community cursor');

  try {
    const parsed = schema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
    if (encodeCursor(parsed) !== encoded) throw new Error('Non-canonical community cursor');
    return parsed;
  } catch {
    throw new Error('Invalid community cursor');
  }
}

export function encodeFeedCursor(tuple: CommunityFeedCursor): string {
  return encodeCursor(tuple);
}

export function decodeFeedCursor(encoded: string): CommunityFeedCursor {
  return decodeCanonicalCursor(encoded, feedCursorSchema);
}

export function encodeSupporterCursor(tuple: CommunitySupporterCursor): string {
  return encodeCursor(tuple);
}

export function decodeSupporterCursor(encoded: string): CommunitySupporterCursor {
  return decodeCanonicalCursor(encoded, supporterCursorSchema);
}
