import { describe, expect, it } from 'vitest';
import * as agendaRoute from '@/app/api/collaborator/agenda/[id]/route';

const agendaPatchSchema = (agendaRoute as typeof agendaRoute & {
  agendaPatchSchema?: {
    safeParse(input: unknown): { success: boolean };
  };
}).agendaPatchSchema;

describe('Agenda PATCH schema', () => {
  it.each([
    ['invalid status', { status: 'archived' }],
    ['invalid date', { date: '16-07-2026' }],
    ['invalid time', { time: '25:90' }],
    ['unknown field', { company_id: 'other-company' }],
  ])('rejects %s', (_case, input) => {
    expect(agendaPatchSchema).toBeDefined();
    expect(agendaPatchSchema?.safeParse(input).success).toBe(false);
  });

  it('accepts a strict valid partial update', () => {
    expect(agendaPatchSchema).toBeDefined();
    expect(agendaPatchSchema?.safeParse({
      title: 'Consulta de retorno',
      date: '2026-07-16',
      time: '09:30',
      notes: 'Levar os exames anteriores',
      status: 'completed',
    }).success).toBe(true);
  });
});
