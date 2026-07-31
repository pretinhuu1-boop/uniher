import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getWriteQueue } from '@/lib/db';
import { runAsActiveRhActor } from '@/lib/security/active-rh-actor';

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

function normalizeReflectionContent(content: Record<string, unknown>) {
  const reflection =
    typeof content.reflection === 'string'
      ? content.reflection.trim()
      : typeof content.prompt === 'string'
        ? content.prompt.trim()
        : '';

  const invalid =
    !reflection ||
    reflection.length < 8 ||
    reflection === '///' ||
    reflection === '...' ||
    reflection === '--';

  return { reflection: invalid ? '' : reflection };
}

const patchLessonSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  type: z.enum(LESSON_TYPES).optional(),
  theme: z.enum(LESSON_THEMES).optional(),
  content_json: z.record(z.string(), z.unknown()).optional(),
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
    if (!companyId || auth.role !== 'rh') {
      return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
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
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const writeQueue = getWriteQueue();
    const outcome = await writeQueue.enqueue((wdb) => (
      runAsActiveRhActor(wdb, auth.userId, companyId, () => {
        const lesson = wdb.prepare(`
          SELECT id, type
          FROM daily_lessons
          WHERE id = ? AND company_id = ?
        `).get(id, companyId) as { id: string; type: string } | undefined;
        if (!lesson) return { status: 'missing' as const };

        const updateData = { ...data };
        const nextType = updateData.type ?? lesson.type;
        if (nextType === 'reflexao') {
          if (!updateData.content_json) {
            return { status: 'reflection_required' as const };
          }
          const normalized = normalizeReflectionContent(updateData.content_json);
          if (!normalized.reflection) {
            return { status: 'reflection_invalid' as const };
          }
          updateData.content_json = normalized;
        }

        const fields: string[] = [];
        const values: unknown[] = [];
        for (const [key, value] of Object.entries(updateData)) {
          if (value === undefined) continue;
          if (key === 'content_json') {
            fields.push('content_json = ?');
            values.push(JSON.stringify(value));
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
        fields.push("updated_at = datetime('now')");

        const updated = wdb.prepare(`
          UPDATE daily_lessons
          SET ${fields.join(', ')}
          WHERE id = ? AND company_id = ?
        `).run(...values, id, companyId);
        if (updated.changes !== 1) return { status: 'missing' as const };

        const value = wdb.prepare(`
          SELECT *
          FROM daily_lessons
          WHERE id = ? AND company_id = ?
        `).get(id, companyId) as Record<string, unknown>;
        return { status: 'updated' as const, value };
      })
    ), 'update RH lesson', { retryOnFailure: false });

    if (!outcome.authorized) {
      return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
    }
    if (outcome.value.status === 'missing') {
      return NextResponse.json({ error: 'Lição não encontrada ou alterada' }, { status: 409 });
    }
    if (outcome.value.status === 'reflection_required') {
      return NextResponse.json({ error: 'Reflexao obrigatoria: envie content_json.reflection.' }, { status: 400 });
    }
    if (outcome.value.status === 'reflection_invalid') {
      return NextResponse.json({ error: 'Reflexao obrigatoria: preencha o campo reflection.' }, { status: 400 });
    }
    const updated = outcome.value.value;

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
    if (!companyId || auth.role !== 'rh') {
      return NextResponse.json({ error: 'Empresa ou papel RH não encontrado' }, { status: 400 });
    }

    const writeQueue = getWriteQueue();
    const outcome = await writeQueue.enqueue((wdb) => (
      runAsActiveRhActor(wdb, auth.userId, companyId, () => {
        const lesson = wdb.prepare(`
          SELECT id
          FROM daily_lessons
          WHERE id = ? AND company_id = ?
        `).get(id, companyId);
        if (!lesson) return false;

        const deleted = wdb.prepare(`
          DELETE FROM daily_lessons
          WHERE id = ? AND company_id = ?
        `).run(id, companyId);
        return deleted.changes === 1;
      })
    ), 'delete RH lesson', { retryOnFailure: false });

    if (!outcome.authorized) {
      return NextResponse.json({ error: 'Autorização do RH expirou' }, { status: 409 });
    }
    if (!outcome.value) {
      return NextResponse.json({ error: 'Lição não encontrada ou alterada' }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
});
