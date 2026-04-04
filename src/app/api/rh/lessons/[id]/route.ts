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

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000) + 1);
}

function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

function isMasterAdmin(auth: { role: string; isMasterAdmin?: boolean }) {
  return auth.isMasterAdmin === true || (auth.role === 'admin' && auth.isMasterAdmin === undefined);
}

function canManageLessonBySchedule(weekNumber: number, dayOfWeek: number) {
  const currentWeek = getCurrentWeek();
  const currentDay = getCurrentDayOfWeek();

  if (weekNumber < currentWeek) return false;
  if (weekNumber === currentWeek && dayOfWeek < currentDay) return false;
  return true;
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
  validated: z.boolean().optional(),
  validation_notes: z.string().max(500).optional(),
});

function parseLessonRow(row: Record<string, unknown>, masterAdmin: boolean) {
  return {
    ...row,
    content_json: row.content_json ? JSON.parse(row.content_json as string) : null,
    isGlobal: row.company_id === null,
    isValidated: Boolean(row.validated_at),
    canManage:
      canManageLessonBySchedule(
        Number(row.week_number ?? 0),
        Number(row.day_of_week ?? 0),
      ) && (masterAdmin || row.company_id !== null),
  };
}

export const PATCH = withRole('rh', 'admin')(async (req, { auth, params }) => {
  try {
    await initDb();
    const { id } = await params;
    const companyId = auth.companyId;
    const masterAdmin = isMasterAdmin(auth);
    const db = getReadDb();

    const lesson = db.prepare(
      'SELECT id, company_id, week_number, day_of_week, type FROM daily_lessons WHERE id = ?'
    ).get(id) as {
      id: string;
      company_id: string | null;
      week_number: number;
      day_of_week: number;
      type: string;
    } | undefined;

    if (!lesson) {
      return NextResponse.json({ error: 'Licao nao encontrada' }, { status: 404 });
    }

    if (lesson.company_id === null && !masterAdmin) {
      return NextResponse.json(
        { error: 'Nao e possivel editar licoes globais' },
        { status: 403 }
      );
    }

    if (!masterAdmin && lesson.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Permissao insuficiente' },
        { status: 403 }
      );
    }

    if (!canManageLessonBySchedule(lesson.week_number, lesson.day_of_week)) {
      return NextResponse.json(
        { error: 'Essa licao so pode ser alterada antes ou no proprio dia agendado.' },
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
    const nextType = data.type ?? lesson.type;

    if (nextType === 'reflexao') {
      if (!data.content_json) {
        return NextResponse.json(
          { error: 'Reflexao obrigatoria: envie content_json.reflection.' },
          { status: 400 }
        );
      }

      const normalized = normalizeReflectionContent(data.content_json);
      if (!normalized.reflection) {
        return NextResponse.json(
          { error: 'Reflexao obrigatoria: preencha o campo reflection.' },
          { status: 400 }
        );
      }

      data.content_json = normalized;
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.validated !== undefined) {
      if (data.validated) {
        fields.push("validated_at = datetime('now')");
        fields.push('validated_by = ?');
        values.push(auth.userId);
        fields.push('validation_notes = ?');
        values.push(data.validation_notes?.trim() || null);
      } else {
        fields.push('validated_at = NULL');
        fields.push('validated_by = NULL');
        fields.push('validation_notes = NULL');
      }
    } else if (data.validation_notes !== undefined) {
      fields.push('validation_notes = ?');
      values.push(data.validation_notes.trim() || null);
    }

    for (const [key, val] of Object.entries(data)) {
      if (val === undefined) continue;
      if (key === 'validated' || key === 'validation_notes') continue;
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
      wdb.prepare(`UPDATE daily_lessons SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    });

    const updated = db.prepare('SELECT * FROM daily_lessons WHERE id = ?').get(id) as Record<string, unknown>;
    return NextResponse.json(parseLessonRow(updated, masterAdmin));
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = withRole('rh', 'admin')(async (_req, { auth, params }) => {
  try {
    await initDb();
    const { id } = await params;
    const companyId = auth.companyId;
    const masterAdmin = isMasterAdmin(auth);
    const db = getReadDb();

    const lesson = db.prepare(
      'SELECT id, company_id, week_number, day_of_week FROM daily_lessons WHERE id = ?'
    ).get(id) as {
      id: string;
      company_id: string | null;
      week_number: number;
      day_of_week: number;
    } | undefined;

    if (!lesson) {
      return NextResponse.json({ error: 'Licao nao encontrada' }, { status: 404 });
    }

    if (lesson.company_id === null && !masterAdmin) {
      return NextResponse.json(
        { error: 'Nao e possivel excluir licoes globais' },
        { status: 403 }
      );
    }

    if (!masterAdmin && lesson.company_id !== companyId) {
      return NextResponse.json(
        { error: 'Permissao insuficiente' },
        { status: 403 }
      );
    }

    if (!canManageLessonBySchedule(lesson.week_number, lesson.day_of_week)) {
      return NextResponse.json(
        { error: 'Essa licao so pode ser excluida antes ou no proprio dia agendado.' },
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
