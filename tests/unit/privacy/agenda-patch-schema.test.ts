import { describe, expect, it } from 'vitest';
import * as agendaCreateRoute from '@/app/api/collaborator/agenda/route';
import * as agendaRoute from '@/app/api/collaborator/agenda/[id]/route';

const agendaCreateSchema = (agendaCreateRoute as typeof agendaCreateRoute & {
  agendaCreateSchema?: {
    safeParse(input: unknown): { success: boolean };
  };
}).agendaCreateSchema;

const agendaPatchSchema = (agendaRoute as typeof agendaRoute & {
  agendaPatchSchema?: {
    safeParse(input: unknown): { success: boolean };
  };
}).agendaPatchSchema;

describe('Agenda POST schema', () => {
  it.each([
    ['impossible date', { title: 'Consulta', type: 'consulta', date: '2026-02-31', time: '09:30' }],
    ['invalid time', { title: 'Consulta', type: 'consulta', date: '2026-07-16', time: '24:01' }],
    ['unknown field', { title: 'Consulta', type: 'consulta', date: '2026-07-16', company_id: 'other-company' }],
  ])('rejects %s', (_case, input) => {
    expect(agendaCreateSchema).toBeDefined();
    expect(agendaCreateSchema?.safeParse(input).success).toBe(false);
  });

  it('accepts a strict valid event with a leap-day date', () => {
    expect(agendaCreateSchema).toBeDefined();
    expect(agendaCreateSchema?.safeParse({
      title: 'Consulta de rotina',
      type: 'consulta',
      date: '2028-02-29',
      time: '09:30',
      notes: 'Levar exames anteriores',
    }).success).toBe(true);
  });
});

describe('Agenda PATCH schema', () => {
  it.each([
    ['invalid status', { status: 'archived' }],
    ['invalid date', { date: '16-07-2026' }],
    ['impossible date', { date: '2026-02-31' }],
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
