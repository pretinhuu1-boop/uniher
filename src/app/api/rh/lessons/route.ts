import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withRole } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

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

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil(diff / (7 * 24 * 60 * 60 * 1000) + 1);
}

function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  // Convert JS Sunday=0 to ISO Monday=1
  return day === 0 ? 7 : day;
}

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

async function ensureWeeklyReflections(companyId: string, weekNumber: number) {
  const db = getReadDb();
  const writeQueue = getWriteQueue();
  const existingRows = db.prepare(
    `SELECT day_of_week FROM daily_lessons
     WHERE company_id = ? AND week_number = ? AND type = 'reflexao' AND active = 1`
  ).all(companyId, weekNumber) as { day_of_week: number }[];
  const existingDays = new Set(existingRows.map((r) => r.day_of_week));

  const defaults = [
    'Segunda: Qual cuidado simples com sua saude voce quer priorizar hoje?',
    'Terca: O que te ajudou a manter energia e foco nesta semana?',
    'Quarta: Qual sinal do seu corpo voce precisa ouvir com mais atencao?',
    'Quinta: Que pequena pausa pode melhorar seu bem-estar hoje?',
    'Sexta: Qual conquista de saude voce reconhece nesta semana?',
    'Sabado: O que voce pode fazer hoje para descansar melhor?',
    'Domingo: Qual intencao de autocuidado voce leva para a proxima semana?',
  ];

  for (let day = 1; day <= 7; day++) {
    if (existingDays.has(day)) continue;

    await writeQueue.enqueue((wdb) => {
      wdb.prepare(
        `INSERT INTO daily_lessons
          (id, company_id, title, description, type, theme, week_number, day_of_week,
           order_index, xp_reward, duration_seconds, active, campaign_context, content_json)
         VALUES (?, ?, ?, ?, 'reflexao', 'mental', ?, ?, 900, 20, 90, 1, ?, ?)`
      ).run(
        nanoid(),
        companyId,
        `Reflexao do dia ${day}`,
        'Reflexao diaria para fortalecer autocuidado e constancia.',
        weekNumber,
        day,
        'Reflexoes diarias',
        JSON.stringify({ reflection: defaults[day - 1] })
      );
    });
  }
}

// GET /api/rh/lessons
export const GET = withRole('rh')(async (req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const companyId = auth.companyId;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const week = url.searchParams.get('week');
    const day = url.searchParams.get('day');
    const theme = url.searchParams.get('theme');
    const type = url.searchParams.get('type');
    const search = url.searchParams.get('search');

    const conditions: string[] = ['(dl.company_id = ? OR dl.company_id IS NULL)'];
    const params: unknown[] = [companyId];

    if (week) {
      conditions.push('dl.week_number = ?');
      params.push(parseInt(week, 10));
    }
    if (day) {
      conditions.push('dl.day_of_week = ?');
      params.push(parseInt(day, 10));
    }
    if (theme) {
      conditions.push('dl.theme = ?');
      params.push(theme);
    }
    if (type) {
      conditions.push('dl.type = ?');
      params.push(type);
    }
    if (search) {
      conditions.push('dl.title LIKE ?');
      params.push(`%${search}%`);
    }

    const weekForProvision = week ? parseInt(week, 10) : getCurrentWeek();
    await ensureWeeklyReflections(companyId, weekForProvision);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM daily_lessons dl ${whereClause}`
    ).get(params) as { total: number };

    const lessons = db.prepare(
      `SELECT
        dl.id,
        dl.title,
        dl.description,
        dl.type,
        dl.theme,
        dl.week_number,
        dl.day_of_week,
        dl.order_index,
        dl.xp_reward,
        dl.duration_seconds,
        dl.active,
        dl.campaign_context,
        dl.content_json,
        dl.company_id
       FROM daily_lessons dl
       ${whereClause}
       ORDER BY dl.week_number ASC, dl.day_of_week ASC, dl.order_index ASC
       LIMIT ? OFFSET ?`
    ).all([...params, limit, offset]) as Record<string, unknown>[];

    const mapped = lessons.map((lesson) => ({
      ...lesson,
      content_json: lesson.content_json
        ? JSON.parse(lesson.content_json as string)
        : null,
      isGlobal: lesson.company_id === null,
    }));

    const total = countRow.total;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ lessons: mapped, total, page, limit, totalPages });
  } catch (error) {
    return handleApiError(error);
  }
});

const createLessonSchema = z.object({
  title: z.string().min(3),
  description: z.string(),
  type: z.enum(LESSON_TYPES),
  theme: z.enum(LESSON_THEMES),
  content_json: z.record(z.string(), z.unknown()),
  week_number: z.number().int().min(1).max(52).optional(),
  day_of_week: z.number().int().min(1).max(7).optional(),
  order_index: z.number().int().min(0).optional().default(0),
  xp_reward: z.number().int().min(10).max(100).optional().default(20),
  duration_seconds: z.number().int().min(30).max(3600).optional().default(120),
  campaign_context: z.string().optional(),
});

// POST /api/rh/lessons
export const POST = withRole('rh')(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = createLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const companyId = auth.companyId;
    const id = nanoid();
    const weekNumber = data.week_number ?? getCurrentWeek();
    const dayOfWeek = data.day_of_week ?? getCurrentDayOfWeek();
    const contentToSave =
      data.type === 'reflexao'
        ? normalizeReflectionContent(data.content_json)
        : data.content_json;

    if (data.type === 'reflexao' && !contentToSave.reflection) {
      return NextResponse.json(
        { error: 'Reflexao obrigatoria: preencha o campo reflection.' },
        { status: 400 }
      );
    }

    const writeQueue = getWriteQueue();

    await writeQueue.enqueue((wdb) => {
      wdb.prepare(
        `INSERT INTO daily_lessons
          (id, company_id, title, description, type, theme, week_number, day_of_week,
           order_index, xp_reward, duration_seconds, active, campaign_context, content_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      ).run(
        id,
        companyId,
        data.title,
        data.description,
        data.type,
        data.theme,
        weekNumber,
        dayOfWeek,
        data.order_index,
        data.xp_reward,
        data.duration_seconds,
        data.campaign_context ?? null,
        JSON.stringify(contentToSave)
      );
    });

    const db = getReadDb();
    const created = db.prepare('SELECT * FROM daily_lessons WHERE id = ?').get(id) as Record<string, unknown>;

    return NextResponse.json(
      {
        ...created,
        content_json: created.content_json ? JSON.parse(created.content_json as string) : null,
        isGlobal: false,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
});
