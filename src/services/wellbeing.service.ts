import { nanoid } from 'nanoid';
import { getReadDb, getWriteQueue } from '@/lib/db';

export const WELLBEING_MOODS = [
  'muito_bem',
  'bem',
  'neutra',
  'cansada',
  'sobrecarregada',
  'nao_informado',
] as const;

export type WellbeingMood = (typeof WELLBEING_MOODS)[number];
export type WellbeingEventType = 'check_in' | 'check_out';

export interface DailyWellbeingStatus {
  day: string;
  checkedInToday: boolean;
  checkedOutToday: boolean;
  checkInMood: WellbeingMood | null;
  checkOutMood: WellbeingMood | null;
}

interface WellbeingEventRow {
  event_type: WellbeingEventType;
  mood: WellbeingMood;
}

export function isWellbeingMood(value: unknown): value is WellbeingMood {
  return typeof value === 'string' && (WELLBEING_MOODS as readonly string[]).includes(value);
}

export function normalizeWellbeingMood(value: unknown): WellbeingMood {
  return isWellbeingMood(value) ? value : 'nao_informado';
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function toDailyStatus(rows: WellbeingEventRow[], day: string): DailyWellbeingStatus {
  const checkIn = rows.find((row) => row.event_type === 'check_in') ?? null;
  const checkOut = rows.find((row) => row.event_type === 'check_out') ?? null;

  return {
    day,
    checkedInToday: Boolean(checkIn),
    checkedOutToday: Boolean(checkOut),
    checkInMood: checkIn?.mood ?? null,
    checkOutMood: checkOut?.mood ?? null,
  };
}

export function getDailyWellbeingStatus(userId: string, day = todayIsoDate()): DailyWellbeingStatus {
  const rows = getReadDb().prepare(`
    SELECT event_type, mood
    FROM wellbeing_events
    WHERE user_id = ?
      AND day = ?
    ORDER BY event_type ASC
  `).all(userId, day) as WellbeingEventRow[];

  return toDailyStatus(rows, day);
}

export async function recordWellbeingEvent(input: {
  userId: string;
  companyId: string;
  eventType: WellbeingEventType;
  mood: WellbeingMood;
  day?: string;
}): Promise<DailyWellbeingStatus & { alreadyDone: boolean }> {
  return getWriteQueue().enqueue((db) => {
    const day = input.day ?? todayIsoDate();
    const inserted = db.prepare(`
      INSERT OR IGNORE INTO wellbeing_events (
        id, user_id, company_id, event_type, mood, day, created_at, updated_at
      ) VALUES (
        @id, @userId, @companyId, @eventType, @mood, @day, datetime('now'), datetime('now')
      )
    `).run({
      id: nanoid(),
      userId: input.userId,
      companyId: input.companyId,
      eventType: input.eventType,
      mood: input.mood,
      day,
    });

    const rows = db.prepare(`
      SELECT event_type, mood
      FROM wellbeing_events
      WHERE user_id = ?
        AND day = ?
      ORDER BY event_type ASC
    `).all(input.userId, day) as WellbeingEventRow[];

    return {
      ...toDailyStatus(rows, day),
      alreadyDone: inserted.changes === 0,
    };
  });
}
