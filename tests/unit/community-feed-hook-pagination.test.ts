import { describe, expect, it } from 'vitest';

import {
  COLLABORATOR_SAVED_KEY,
  buildCollaboratorFeedKey,
  buildCollaboratorSavedKey,
  isCollaboratorSavedCacheKeyForIdentity,
  mergeCommunityFeedPages,
} from '@/hooks/useCollaborator';
import type { CommunityFeedItem, CommunityFeedResponse } from '@/types/community';

function item(id: string): CommunityFeedItem {
  return {
    id,
    title: `Conteúdo ${id}`,
    summary: 'Resumo editorial seguro.',
    bodyText: 'Corpo editorial em texto simples.',
    topic: 'geral',
    readTimeMinutes: 3,
    imagePath: null,
    publishedAt: '2026-07-20T12:00:00.000Z',
    supportCount: 0,
    supportedByMe: false,
    savedByMe: false,
  };
}

function page(items: CommunityFeedItem[], nextCursor: string | null): CommunityFeedResponse {
  return {
    items,
    nextCursor,
    scope: 'company',
    settings: { companyFeedEnabled: true },
  };
}

describe('collaborator feed pagination helpers', () => {
  it('maps typed topics and cursors to the company feed contract', () => {
    expect(buildCollaboratorFeedKey()).toBe('/api/collaborator/feed?scope=company&limit=20');
    expect(buildCollaboratorFeedKey('pausas')).toBe('/api/collaborator/feed?scope=company&limit=20&topic=pausas');
    expect(buildCollaboratorFeedKey('sono', 'cursor /?')).toBe(
      '/api/collaborator/feed?scope=company&limit=20&topic=sono&cursor=cursor%20%2F%3F',
    );
  });

  it('preserves feed order while removing duplicated items across cursor pages', () => {
    expect(mergeCommunityFeedPages([
      page([item('a'), item('b')], 'cursor-b'),
      page([item('b'), item('c')], null),
    ]).map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps saved identity in the SWR tuple without sending it as query parameters', () => {
    expect(buildCollaboratorSavedKey([
      'user-a',
      'company-a',
      'rh',
      1,
    ])).toEqual([
      COLLABORATOR_SAVED_KEY,
      'user-a',
      'company-a',
      'rh',
      1,
    ]);
    expect(COLLABORATOR_SAVED_KEY).toBe('/api/collaborator/saved?limit=20');
  });

  it('matches every saved tuple for the same user and company regardless of role or capability', () => {
    const identity = ['user-a', 'company-a', 'colaboradora', 1] as const;

    expect(isCollaboratorSavedCacheKeyForIdentity(
      buildCollaboratorSavedKey(['user-a', 'company-a', 'rh', 0]),
      identity,
    )).toBe(true);
    expect(isCollaboratorSavedCacheKeyForIdentity(
      buildCollaboratorSavedKey(['user-a', 'company-a', 'admin', 1]),
      identity,
    )).toBe(true);
    expect(isCollaboratorSavedCacheKeyForIdentity(
      buildCollaboratorSavedKey(['user-b', 'company-a', 'colaboradora', 1]),
      identity,
    )).toBe(false);
    expect(isCollaboratorSavedCacheKeyForIdentity(
      buildCollaboratorSavedKey(['user-a', 'company-b', 'colaboradora', 1]),
      identity,
    )).toBe(false);
    expect(isCollaboratorSavedCacheKeyForIdentity(
      ['/api/collaborator/saved?limit=20&session=user-a'],
      identity,
    )).toBe(false);
  });
});
