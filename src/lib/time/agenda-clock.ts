export const AGENDA_TIME_ZONE = 'America/Sao_Paulo';

const civilFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: AGENDA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

export interface AgendaCivilDateTime {
  date: string;
  time: string;
  dateTime: string;
}

export function toAgendaCivilDateTime(instant: Date): AgendaCivilDateTime {
  const parts = new Map(
    civilFormatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  const year = parts.get('year');
  const month = parts.get('month');
  const day = parts.get('day');
  const hour = parts.get('hour');
  const minute = parts.get('minute');
  const second = parts.get('second');
  if (!year || !month || !day || !hour || !minute || !second) {
    throw new Error('Unable to resolve Agenda civil time');
  }

  const date = `${year}-${month}-${day}`;
  const time = `${hour}:${minute}`;
  return { date, time, dateTime: `${date} ${time}:${second}` };
}

export function getAgendaReminderWindow(now: Date) {
  const start = toAgendaCivilDateTime(now);
  const end = toAgendaCivilDateTime(new Date(now.getTime() + 30 * 60 * 1000));
  return { windowStart: start.dateTime, windowEnd: end.dateTime, today: start.date };
}

export function getAgendaSnoozeTime(now: Date) {
  return toAgendaCivilDateTime(new Date(now.getTime() + 15 * 60 * 1000));
}
