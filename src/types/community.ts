export const COMMUNITY_TOPICS = ['pausas', 'sono', 'movimento', 'cuidado', 'geral'] as const;

export type CommunityTopic = (typeof COMMUNITY_TOPICS)[number];
export type CommunityPostStatus = 'draft' | 'published' | 'archived';

export interface CommunityFeedItem {
  id: string;
  title: string;
  summary: string;
  bodyText: string;
  topic: CommunityTopic;
  readTimeMinutes: number;
  imagePath: string | null;
  publishedAt: string;
  supportCount: number;
  supportedByMe: boolean;
  savedByMe: boolean;
}

export interface CommunityFeedResponse {
  items: CommunityFeedItem[];
  nextCursor: string | null;
  scope: 'company';
  settings: { companyFeedEnabled: boolean };
}
