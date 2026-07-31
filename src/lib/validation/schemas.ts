import { z } from 'zod';
import { getSaoPauloDateOnly } from '@/lib/health-checkin/mapper';

// === AUTH ===

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  email: z.string().email('Email inválido').max(255),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(100)
    .regex(/[A-Z]/, 'Senha precisa de pelo menos 1 letra maiúscula')
    .regex(/[a-z]/, 'Senha precisa de pelo menos 1 letra minúscula')
    .regex(/[0-9]/, 'Senha precisa de pelo menos 1 número')
    .regex(/[!@#$%&*]/, 'Senha precisa de 1 caractere especial (!@#$%&*)'),
  role: z.literal('rh'),
  company: z.object({
    name: z.string().min(2).max(255),
    cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
    tradeName: z.string().max(255).optional(),
    sector: z.string().max(100).optional(),
    contactName: z.string().max(255).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),
  }),
}).strict();

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

const dateOnlySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date')
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'invalid date');

export const healthCheckinExamAnswerSchema = z.object({
  completedDate: dateOnlySchema.nullable().optional(),
  dueDate: dateOnlySchema.nullable().optional(),
  unknown: z.boolean().optional(),
  notApplicable: z.boolean().optional(),
}).superRefine((answer, context) => {
  const completedDate = answer.completedDate ?? null;
  const dueDate = answer.dueDate ?? null;

  if (completedDate && completedDate > getSaoPauloDateOnly()) {
    context.addIssue({
      code: 'custom',
      path: ['completedDate'],
      message: 'completed date cannot be in the future',
    });
  }
  if (completedDate && dueDate && dueDate < completedDate) {
    context.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'due date cannot be before completed date',
    });
  }
  if (answer.notApplicable) {
    if (answer.unknown || completedDate || dueDate) {
      context.addIssue({
        code: 'custom',
        message: 'not applicable cannot include dates or unknown state',
      });
    }
    return;
  }
  if (answer.unknown) {
    if (dueDate) {
      context.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'unknown due date cannot include a due date',
      });
    }
    return;
  }
  if (!dueDate) {
    context.addIssue({
      code: 'custom',
      path: ['dueDate'],
      message: 'due date or unknown state is required',
    });
  }
});

export const healthCheckinAnswersSchema = z.object({
  birthDate: dateOnlySchema.optional(),
  exams: z.record(z.string(), healthCheckinExamAnswerSchema)
    .refine((exams) => Object.keys(exams).length > 0, 'at least one exam is required'),
});

export const healthCheckinSchema = z.object({
  source: z.literal('semaforo_exam_quiz_v1'),
  consent: z.object({
    accepted: z.boolean().refine((value) => value === true, 'consent is required'),
    version: z.literal('semaforo-exams-v1'),
  }),
  answers: healthCheckinAnswersSchema,
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
  consent: z.literal(true),
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
export type HealthCheckinInput = z.infer<typeof healthCheckinSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
