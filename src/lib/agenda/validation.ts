import { z } from 'zod';

export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}, 'Data invalida');

export const agendaTimeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);

const optionalCreateTimeSchema = z.preprocess(
  (value) => value === '' ? undefined : value,
  agendaTimeSchema.optional(),
);

export const agendaCreateSchema = z.object({
  title: z.string().min(2).max(200),
  type: z.enum(['exame', 'consulta', 'lembrete']),
  date: calendarDateSchema,
  time: optionalCreateTimeSchema,
  notes: z.string().max(500).optional(),
}).strict();

export const agendaPatchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  date: calendarDateSchema.optional(),
  time: agendaTimeSchema.optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['pending', 'completed', 'cancelled', 'missed']).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Nenhum campo para atualizar');
