import { z } from 'zod';
import { COMMUNITY_TOPICS } from '@/types/community';

const opaqueCursorSchema = z.string().min(1);
const localImagePathSchema = z.string().refine((value) => {
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false;
  if (/^(?:https?:|javascript:|data:)/i.test(value)) return false;
  return !value.split('/').includes('..');
}, 'Image path must be a safe local absolute path');
const optionalIsoDateSchema = z.iso.datetime({ offset: true }).nullable().optional();

export const communityFeedQuerySchema = z.object({
  topic: z.enum(COMMUNITY_TOPICS).optional(),
  cursor: opaqueCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
}).strict();

export const communitySavedQuerySchema = z.object({
  cursor: opaqueCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
}).strict();

export const communitySupportersQuerySchema = z.object({
  cursor: opaqueCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(20).default(20),
}).strict();

export const communityPostManagementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(240),
  bodyText: z.string().min(20).max(8000),
  topic: z.enum(COMMUNITY_TOPICS),
  readTimeMinutes: z.coerce.number().int().min(1).max(60),
  imagePath: localImagePathSchema.nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']),
  publishedAt: optionalIsoDateSchema,
  expiresAt: optionalIsoDateSchema,
}).strict();

export const communityPostCreateSchema = communityPostManagementSchema;

export const communityPostPatchSchema = communityPostManagementSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export type CommunityFeedQuery = z.infer<typeof communityFeedQuerySchema>;
export type CommunitySavedQuery = z.infer<typeof communitySavedQuerySchema>;
export type CommunitySupportersQuery = z.infer<typeof communitySupportersQuerySchema>;
export type CommunityPostCreateInput = z.infer<typeof communityPostCreateSchema>;
export type CommunityPostPatchInput = z.infer<typeof communityPostPatchSchema>;
