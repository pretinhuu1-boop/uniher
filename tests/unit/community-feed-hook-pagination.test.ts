import { describe, expect, it } from 'vitest';

import {
  buildCollaboratorFeedKey,
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
});
