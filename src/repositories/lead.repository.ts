import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  archetype: string | null;
  consent: number;
  source: string | null;
  created_at: string;
}

export function getLeadByEmail(email: string): LeadRow | undefined {
  const db = getReadDb();
  return db.prepare('SELECT * FROM leads WHERE email = ?').get(email) as LeadRow | undefined;
}

export async function createLead(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  archetype?: string;
  consent: boolean;
  source?: string;
}): Promise<LeadRow> {
  const writeQueue = getWriteQueue();
  const id = nanoid();

  return writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT OR REPLACE INTO leads (id, name, email, phone, company, archetype, consent, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.name,
      data.email,
      data.phone || null,
      data.company || null,
      data.archetype || null,
      data.consent ? 1 : 0,
      data.source || 'quiz'
    );
    return db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadRow;
  });
}
