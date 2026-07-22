import { z } from 'zod';
import {
  ELIGIBLE_PARTICIPATION_EVENTS,
  PARTICIPATION_ELIGIBILITY_VERSION,
  PARTICIPATION_SOURCE_DOMAINS,
} from '@/types/participation';

export const participationEventTypeSchema = z.enum(ELIGIBLE_PARTICIPATION_EVENTS);
export const participationSourceDomainSchema = z.enum(PARTICIPATION_SOURCE_DOMAINS);

export const participationEventSchema = z.object({
  id: z.string().min(1),
  event_key: z.string().regex(/^[a-f0-9]{64}$/),
  mutation_id: z.string().min(1),
  company_id: z.string().min(1),
  user_id: z.string().min(1),
  event_type: participationEventTypeSchema,
  source_domain: participationSourceDomainSchema,
  source_id: z.string().min(1),
  eligibility_version: z.literal(PARTICIPATION_ELIGIBILITY_VERSION),
  metadata_json: z.literal('{}'),
  occurred_at: z.string().min(1),
  created_at: z.string().min(1),
});
