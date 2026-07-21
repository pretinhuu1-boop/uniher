import {
  decodeFeedCursor,
  decodeSupporterCursor,
  encodeFeedCursor,
  encodeSupporterCursor,
} from '@/lib/community/cursor';
import {
  communityFeedQuerySchema,
  communitySavedQuerySchema,
  communitySupportersQuerySchema,
  type CommunityFeedQuery,
  type CommunitySavedQuery,
  type CommunitySupportersQuery,
} from '@/lib/community/schemas';
import type { CommunityRepository } from '@/repositories/community.repository';
import type { CommunityFeedResponse } from '@/types/community';

export type CommunityActor = { userId: string; companyId?: string | null };
export type CommunityServiceErrorCode =
  | 'COMPANY_REQUIRED'
  | 'MEMBERSHIP_DENIED'
  | 'FEED_DISABLED'
  | 'POST_NOT_FOUND';

export class CommunityServiceError extends Error {
  constructor(
    public readonly code: CommunityServiceErrorCode,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'CommunityServiceError';
  }
}

function requireCompany(actor: CommunityActor, repository: CommunityRepository): string {
  const companyId = actor.companyId?.trim();
  if (!companyId) throw new CommunityServiceError('COMPANY_REQUIRED', 400, 'Company context is required');
  if (!repository.isActiveMember(actor.userId, companyId)) {
    throw new CommunityServiceError('MEMBERSHIP_DENIED', 403, 'Community membership denied');
  }
  return companyId;
}

function requireEnabledFeed(repository: CommunityRepository, companyId: string): void {
  if (!repository.isFeedEnabled(companyId)) {
    throw new CommunityServiceError('FEED_DISABLED', 403, 'Community feed is disabled');
  }
}

function requirePost(
  repository: CommunityRepository,
  postId: string,
  companyId: string,
  now: string,
): void {
  if (!repository.hasActivePublishedPost(postId, companyId, now)) {
    throw new CommunityServiceError('POST_NOT_FOUND', 404, 'Community post not found');
  }
}

function emptyFeedResponse(): CommunityFeedResponse {
  return {
    items: [],
    nextCursor: null,
    scope: 'company',
    settings: { companyFeedEnabled: false },
  };
}

export function getCommunityFeed(
  actor: CommunityActor,
  repository: CommunityRepository,
  input: Partial<CommunityFeedQuery> = {},
  now = new Date().toISOString(),
): CommunityFeedResponse {
  const companyId = requireCompany(actor, repository);
  const query = communityFeedQuerySchema.parse(input);
  if (!repository.isFeedEnabled(companyId)) return emptyFeedResponse();
  const page = repository.listFeed({
    userId: actor.userId,
    companyId,
    topic: query.topic,
    cursor: query.cursor ? decodeFeedCursor(query.cursor) : undefined,
    limit: query.limit,
    now,
  });
  return {
    items: page.items,
    nextCursor: page.nextCursorTuple ? encodeFeedCursor(page.nextCursorTuple) : null,
    scope: 'company',
    settings: { companyFeedEnabled: true },
  };
}

export function getSavedCommunityPosts(
  actor: CommunityActor,
  repository: CommunityRepository,
  input: Partial<CommunitySavedQuery> = {},
  now = new Date().toISOString(),
): CommunityFeedResponse {
  const companyId = requireCompany(actor, repository);
  const query = communitySavedQuerySchema.parse(input);
  if (!repository.isFeedEnabled(companyId)) return emptyFeedResponse();
  const page = repository.listSaved({
    userId: actor.userId,
    companyId,
    cursor: query.cursor ? decodeFeedCursor(query.cursor) : undefined,
    limit: query.limit,
    now,
  });
  return {
    items: page.items,
    nextCursor: page.nextCursorTuple ? encodeFeedCursor(page.nextCursorTuple) : null,
    scope: 'company',
    settings: { companyFeedEnabled: true },
  };
}

function prepareMutation(
  actor: CommunityActor,
  repository: CommunityRepository,
  postId: string,
  now: string,
): string {
  const companyId = requireCompany(actor, repository);
  requireEnabledFeed(repository, companyId);
  requirePost(repository, postId, companyId, now);
  return companyId;
}

export function addCommunityPostSupport(
  actor: CommunityActor,
  repository: CommunityRepository,
  postId: string,
  now = new Date().toISOString(),
): { supportCount: number; supportedByMe: boolean } {
  prepareMutation(actor, repository, postId, now);
  repository.addSupport(postId, actor.userId);
  return repository.getSupportState(postId, actor.userId);
}

export function removeCommunityPostSupport(
  actor: CommunityActor,
  repository: CommunityRepository,
  postId: string,
  now = new Date().toISOString(),
): { supportCount: number; supportedByMe: boolean } {
  prepareMutation(actor, repository, postId, now);
  repository.removeSupport(postId, actor.userId);
  return repository.getSupportState(postId, actor.userId);
}

export function saveCommunityPost(
  actor: CommunityActor,
  repository: CommunityRepository,
  postId: string,
  now = new Date().toISOString(),
): { savedByMe: boolean } {
  prepareMutation(actor, repository, postId, now);
  repository.addSave(postId, actor.userId);
  return { savedByMe: repository.isSaved(postId, actor.userId) };
}

export function unsaveCommunityPost(
  actor: CommunityActor,
  repository: CommunityRepository,
  postId: string,
  now = new Date().toISOString(),
): { savedByMe: boolean } {
  prepareMutation(actor, repository, postId, now);
  repository.removeSave(postId, actor.userId);
  return { savedByMe: repository.isSaved(postId, actor.userId) };
}

export function getCommunitySupporters(
  actor: CommunityActor,
  repository: CommunityRepository,
  postId: string,
  input: Partial<CommunitySupportersQuery> = {},
  now = new Date().toISOString(),
): { names: string[]; nextCursor: string | null } {
  const companyId = requireCompany(actor, repository);
  const query = communitySupportersQuerySchema.parse(input);
  requirePost(repository, postId, companyId, now);
  const page = repository.listSupporters({
    postId,
    companyId,
    cursor: query.cursor ? decodeSupporterCursor(query.cursor) : undefined,
    limit: query.limit,
  });
  return {
    names: page.names,
    nextCursor: page.nextCursorTuple ? encodeSupporterCursor(page.nextCursorTuple) : null,
  };
}
