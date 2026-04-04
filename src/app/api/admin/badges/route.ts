import { NextRequest, NextResponse } from 'next/server';
import { withMasterAdmin } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1).max(10),
  points: z.number().int().min(0).default(0),
  rarity: z.enum(['common', 'rare', 'epic', 'legendary']).default('common'),
});

// GET — admin only
export const GET = withMasterAdmin(async (_req: NextRequest) => {
  await initDb();
  const db = getReadDb();
  const badges = db.prepare(`
    SELECT b.id, b.name, b.description, b.icon, b.points, b.rarity, b.created_at,
           COUNT(ub.user_id) AS holder_count
    FROM badges b
    LEFT JOIN user_badges ub ON ub.badge_id = b.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).all();
  return NextResponse.json({ badges });
});

// POST — admin only
export const POST = withMasterAdmin(async (req: NextRequest) => {
  await initDb();
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, description, icon, points, rarity } = parsed.data;
  const id = nanoid();
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO badges (id, name, description, icon, points, rarity)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, description, icon, points, rarity);
  });

  return NextResponse.json({ success: true, id }, { status: 201 });
});
