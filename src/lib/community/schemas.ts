import { z } from 'zod';
import { COMMUNITY_TOPICS } from '@/types/community';

const opaqueCursorSchema = z.string().min(1);
const encodedPathSeparatorPattern = /%(?:2f|5c)/i;
const localProtocolPattern = /(?:https?|javascript|data):/i;
const maxLocalPathDecodePasses = 4;

function isSafeLocalPathStage(value: string): boolean {
  if (!value.startsWith('/') || value.includes('//') || value.includes('\\')) return false;
  if (encodedPathSeparatorPattern.test(value) || localProtocolPattern.test(value)) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;

  const segments = value.slice(1).split('/');
  return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

const localImagePathSchema = z.string().refine((value) => {
  let stage = value;

  for (let pass = 0; pass <= maxLocalPathDecodePasses; pass += 1) {
    if (!isSafeLocalPathStage(stage)) return false;
    if (!stage.includes('%')) return true;
    if (pass === maxLocalPathDecodePasses) return false;

    try {
      stage = decodeURIComponent(stage);
    } catch {
      return false;
    }
  }

  return false;
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
