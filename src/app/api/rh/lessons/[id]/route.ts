import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';

const LESSON_TYPES = [
  'pilula',
  'quiz',
  'reflexao',
  'lacuna',
  'verdadeiro_falso',
  'ordenar',
  'parear',
  'historia',
  'flashcard',
  'imagem',
  'desafio_dia',
] as const;

const LESSON_THEMES = [
  'hidratacao',
  'sono',
  'prevencao',
  'nutricao',
  'mental',
  'ciclo',
  'geral',
] as const;

const patchLessonSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  type: z.enum(LESSON_TYPES).optional(),
  theme: z.enum(LESSON_THEMES).optional(),
  content_json: z.record(z.unknown()).optional(),
  week_number: z.number().int().min(1).max(52).optional(),
  day_of_week: z.number().int().min(1).max(7).optional(),
  order_index: z.number().int().min(0).optional(),
  xp_reward: z.number().int().min(10).max(100).optional(),
  duration_seconds: z.number().int().min(30).max(3600).optional(),
  active: z.number().int().min(0).max(1).optional(),
  campaign_context: z.string().optional(),
});

// PATCH /api/rh/lessons/[id]
export const PATCH = withRole('rh')(async (req, { auth, params }) => {
  try {
    await initDb();
    const { id } = await params;
    const companyId = auth.companyId;
    const db = getReadDb();

    const lesson = db.prepare(
      'SELECT id, company_id FROM daily_lessons WHERE id = ?'
    ).get(id) as { id: string; company_id: string | null } | undefined;

    if (!lesson) {
      return NextResponse.json({ error: 'Lição não encontrada' }, { status: 404 });
    }

    if (lesson.company_id === null) {
      return NextResponse.json(
        { error: 'Não é possível editar lições globais' },
        { status: 403 }
      );
    }

    if (lesson.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = patchLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;
      if (key === 'content_json') {
        fields.push('content_json = ?');
        values.push(JSON.stringify(val));
      } else {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      wdb.prepare(
        `UPDATE daily_lessons SET ${fields.join(', ')} WHERE id = ?`
      ).run(...values);
    });

    const updated = db.prepare('SELECT * FROM daily_lessons WHERE id = ?').get(id) as Record<string, unknown>;

    return NextResponse.json({
      ...updated,
      content_json: updated.content_json ? JSON.parse(updated.content_json as string) : null,
      isGlobal: false,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

// DELETE /api/rh/lessons/[id]
export const DELETE = withRole('rh')(async (_req, { auth, params }) => {
  try {
    await initDb();
    const { id } = await params;
    const companyId = auth.companyId;
    const db = getReadDb();

    const lesson = db.prepare(
      'SELECT id, company_id FROM daily_lessons WHERE id = ?'
    ).get(id) as { id: string; company_id: string | null } | undefined;

    if (!lesson) {
      return NextResponse.json({ error: 'Lição não encontrada' }, { status: 404 });
    }

    if (lesson.company_id === null) {
      return NextResponse.json(
        { error: 'Não é possível excluir lições globais' },
        { status: 403 }
      );
    }

    if (lesson.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Permissão insuficiente' },
        { status: 403 }
      );
    }

    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      wdb.prepare('DELETE FROM daily_lessons WHERE id = ?').run(id);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
