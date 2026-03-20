import { z } from 'zod';

// === AUTH ===

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  email: z.string().email('Email inválido').max(255),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres').max(128),
  role: z.enum(['admin', 'rh', 'lideranca', 'colaboradora']),
  companyId: z.string().optional(),
  departmentId: z.string().optional(),
  inviteToken: z.string().optional(),
  company: z.object({
    name: z.string().min(2).max(255),
    cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
    tradeName: z.string().max(255).optional(),
    sector: z.string().max(100).optional(),
    contactName: z.string().max(255).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),
  }).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

// === COMPANY ===

export const companySchema = z.object({
  name: z.string().min(2).max(255),
  tradeName: z.string().max(255).optional(),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  sector: z.string().max(100).optional(),
  contactName: z.string().max(255).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
});

// === QUIZ ===

export const quizSubmitSchema = z.object({
  answers: z.array(z.union([z.number(), z.array(z.number()), z.null()])).length(6),
  archetypeKey: z.enum(['guardia', 'protetora', 'guerreira', 'equilibrista']),
});

// === CHALLENGES ===

export const createChallengeSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(3).max(1000),
  category: z.string().min(1).max(50),
  points: z.number().int().min(0).max(1000),
  totalSteps: z.number().int().min(1).max(100),
  deadline: z.string().optional(),
});

export const updateProgressSchema = z.object({
  progress: z.number().int().min(0).optional(),
  increment: z.number().int().min(1).default(1),
});

// === LEADS ===

export const leadSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  company: z.string().max(255).optional(),
  archetype: z.string().optional(),
  consent: z.boolean(),
  source: z.string().max(50).optional(),
});

// === NOTIFICATIONS ===

export const markReadSchema = z.object({
  read: z.boolean(),
});

// === PROFILE ===

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  avatarUrl: z.string().max(500).optional(),
});

// === PAGINATION ===

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type QuizSubmitInput = z.infer<typeof quizSubmitSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
