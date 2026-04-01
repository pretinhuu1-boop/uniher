import { NextResponse } from 'next/server';
import { z } from 'zod';
import { initDb } from '@/lib/db/init';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { addPoints } from '@/services/gamification.service';

function extractTopicTitle(title: unknown): string {
  if (typeof title !== 'string') return 'tema da licao';
  const [, ...rest] = title.split(':');
  return (rest.join(':').trim() || title).trim();
}

function firstSentence(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  const sentence = cleaned.split('.').map((part) => part.trim()).find(Boolean);
  return sentence || fallback;
}

function buildCanonicalPairs(
  topicTitle: string,
  explanation: unknown,
  question?: unknown,
  correctOption?: unknown,
  mythStatement?: unknown,
  mythVerdict?: unknown,
  challenge?: unknown,
  reflection?: unknown
) {
  const summary = firstSentence(explanation, `Entenda melhor ${topicTitle.toLowerCase()}.`);
  const questionText = typeof question === 'string' && question.trim()
    ? question.trim()
    : `Qual e o principal ponto sobre ${topicTitle.toLowerCase()}?`;
  const bestAnswer = typeof correctOption === 'string' && correctOption.trim()
    ? correctOption.trim()
    : `Resposta correta sobre ${topicTitle.toLowerCase()}.`;
  const mythText = typeof mythStatement === 'string' && mythStatement.trim()
    ? mythStatement.trim()
    : `Afirmacao comum sobre ${topicTitle.toLowerCase()}.`;
  const verdictText = typeof mythVerdict === 'boolean'
    ? (mythVerdict ? 'Verdadeiro' : 'Falso')
    : 'Classifique como verdadeiro ou falso.';
  const reflectionPrompt = typeof reflection === 'string' && reflection.trim()
    ? reflection.trim()
    : `Pensando na sua rotina, qual cuidado combina melhor com ${topicTitle.toLowerCase()}?`;
  const practicalAction = typeof challenge === 'string' && challenge.trim()
    ? challenge.trim()
    : 'Leve esse aprendizado para uma acao simples no seu dia.';

  return [
    { left: questionText, right: bestAnswer },
    { left: `Verdadeiro ou falso: ${mythText}`, right: verdictText },
    { left: `O que profissionais de saude explicam sobre ${topicTitle.toLowerCase()}?`, right: summary },
    { left: reflectionPrompt, right: practicalAction },
  ];
}

function buildReflectionOptions(topicTitle: string, challenge?: unknown): string[] {
  const topic = topicTitle.toLowerCase();
  const action = typeof challenge === 'string' && challenge.trim()
    ? challenge.trim()
    : `Quero testar um cuidado simples com ${topic}.`;

  return [
    'Isso já acontece comigo.',
    'Quero observar melhor esse sinal no meu dia.',
    action,
    'Se isso persistir, vou buscar orientação profissional.',
  ];
}

function normalizeLessonContent(type: unknown, contentJson: unknown, lessonTitle?: unknown) {
  if (!contentJson || typeof contentJson !== 'string') return null;
  try {
    const parsed = JSON.parse(contentJson) as Record<string, unknown>;
    const topicTitle = extractTopicTitle(lessonTitle);
    if (type === 'reflexao') {
      const reflection =
        typeof parsed.reflection === 'string'
          ? parsed.reflection.trim()
          : '';
      const prompt =
        typeof parsed.prompt === 'string'
          ? parsed.prompt.trim()
          : '';

      const isInvalidReflection = (value: string) =>
        !value ||
        value.length < 8 ||
        value === '///' ||
        value === '...' ||
        value === '--';

      if (!isInvalidReflection(reflection)) {
        return {
          ...parsed,
          reflection,
          options: Array.isArray(parsed.options) && parsed.options.length > 1
            ? parsed.options
            : buildReflectionOptions(topicTitle, parsed.challenge ?? parsed.tip ?? parsed.d),
          action_label: typeof parsed.action_label === 'string' && parsed.action_label.trim()
            ? parsed.action_label
            : 'Registrar minha escolha',
        };
      }
      if (!isInvalidReflection(prompt)) {
        return {
          ...parsed,
          reflection: parsed.prompt,
          options: Array.isArray(parsed.options) && parsed.options.length > 1
            ? parsed.options
            : buildReflectionOptions(topicTitle, parsed.challenge ?? parsed.tip ?? parsed.d),
          action_label: typeof parsed.action_label === 'string' && parsed.action_label.trim()
            ? parsed.action_label
            : 'Registrar minha escolha',
        };
      }
      return {
        ...parsed,
        reflection: 'Pense em um cuidado simples que voce pode praticar hoje por voce.',
        options: buildReflectionOptions(topicTitle, parsed.challenge ?? parsed.tip ?? parsed.d),
        action_label: 'Registrar minha escolha',
      };
    }
    if (type === 'parear') {
      return {
        ...parsed,
        pairs: buildCanonicalPairs(
          topicTitle,
          parsed.explanation,
          parsed.question,
          Array.isArray(parsed.options) && typeof parsed.correct === 'number' ? parsed.options[parsed.correct] : undefined,
          parsed.v,
          parsed.vb,
          parsed.challenge ?? parsed.tip ?? parsed.d,
          parsed.reflection ?? parsed.r
        ),
      };
    }
    if (
      type === 'quiz' &&
      typeof parsed.question === 'string' &&
      Array.isArray(parsed.options) &&
      typeof parsed.correct === 'number' &&
      !Array.isArray(parsed.questions)
    ) {
      return {
        ...parsed,
        questions: [{
          question: parsed.question,
          options: parsed.options,
          correct: parsed.correct,
          explanation: typeof parsed.explanation === 'string'
            ? parsed.explanation
            : firstSentence(parsed.context, `Entenda melhor ${topicTitle.toLowerCase()}.`),
        }],
      };
    }
    if (type === 'ordenar' && Array.isArray(parsed.steps) && Array.isArray(parsed.correctOrder)) {
      return {
        ...parsed,
        items: parsed.steps,
        correct_order: parsed.correctOrder,
        explanation: typeof parsed.explanation === 'string'
          ? parsed.explanation
          : 'Organize os passos do cuidado do mais imediato ao mais continuo.',
      };
    }
    if (type === 'historia' && Array.isArray(parsed.options) && typeof parsed.correct === 'number') {
      const explanation = firstSentence(parsed.explanation, `A melhor escolha e a que mais combina com ${topicTitle.toLowerCase()}.`);
      return {
        ...parsed,
        scenario: typeof parsed.scenario === 'string'
          ? parsed.scenario
          : `Voce esta lidando com ${topicTitle.toLowerCase()} e precisa escolher a melhor conduta.`,
        choices: (parsed.options as string[]).map((text, idx) => ({
          text,
          correct: idx === parsed.correct,
          feedback: idx === parsed.correct
            ? `${explanation} Essa e a resposta mais alinhada com a licao.`
            : `${explanation} Esta opcao parece plausivel, mas nao e a melhor resposta para esta situacao.`,
        })),
      };
    }
    if (type === 'flashcard' && Array.isArray(parsed.cards) && !parsed.front && !parsed.back) {
      const firstCard = (parsed.cards as Array<Record<string, unknown>>)[0] ?? {};
      return {
        ...parsed,
        front: typeof firstCard.front === 'string' ? firstCard.front : `O que observar sobre ${topicTitle}?`,
        back: typeof firstCard.back === 'string'
          ? firstCard.back
          : firstSentence(parsed.explanation, `O principal ponto sobre ${topicTitle.toLowerCase()} e aplicar o cuidado com constancia.`),
      };
    }
    if (type === 'desafio_dia') {
      return {
        ...parsed,
        challenge: typeof parsed.challenge === 'string'
          ? parsed.challenge
          : `Escolha uma acao simples sobre ${topicTitle.toLowerCase()} para praticar hoje.`,
        motivation: typeof parsed.motivation === 'string'
          ? parsed.motivation
          : firstSentence(parsed.reflection ?? parsed.context, `Um pequeno passo hoje ajuda a consolidar o cuidado com ${topicTitle.toLowerCase()}.`),
        tip: typeof parsed.tip === 'string'
          ? parsed.tip
          : firstSentence(parsed.context, 'Comece pelo passo mais simples e sustentavel para voce.'),
      };
    }
    return parsed;
  } catch {
    if (type === 'reflexao') {
      return {
        reflection: 'Pense em um cuidado simples que voce pode praticar hoje por voce.',
      };
    }
    return null;
  }
}

// GET /api/gamification/daily-lesson - Returns today's lesson for logged-in user
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const db = getReadDb();
    const userId = auth.userId;
    const companyId = auth.companyId;
    const today = new Date().toISOString().split('T')[0];

    // Determine user's current week/day based on progress
    const completedCount = (db.prepare(
      `SELECT COUNT(*) as count FROM user_lesson_progress
       WHERE user_id = ? AND completed = 1`
    ).get(userId) as { count: number }).count;

    // Current week and day_of_week (1-indexed)
    const dayOfWeek = new Date().getDay() || 7; // 1=Mon, 7=Sun
    const currentWeek = Math.floor(completedCount / 7) + 1;

    // Build daily path (Duolingo-like): multiple lessons in sequence for today
    let path = db.prepare(
      `SELECT dl.*,
              ulp.completed as user_completed,
              ulp.score as user_score,
              ulp.xp_earned as user_xp_earned,
              ulp.completed_at
       FROM daily_lessons dl
       LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
       WHERE dl.company_id = ? AND dl.week_number = ? AND dl.day_of_week = ? AND dl.active = 1
       ORDER BY dl.order_index ASC
       LIMIT 4`
    ).all(userId, companyId, currentWeek, dayOfWeek) as Record<string, unknown>[];

    if (!path || path.length === 0) {
      // Fallback to global lessons
      path = db.prepare(
        `SELECT dl.*,
                ulp.completed as user_completed,
                ulp.score as user_score,
                ulp.xp_earned as user_xp_earned,
                ulp.completed_at
         FROM daily_lessons dl
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
         WHERE dl.company_id IS NULL AND dl.week_number = ? AND dl.day_of_week = ? AND dl.active = 1
         ORDER BY dl.order_index ASC
         LIMIT 4`
      ).all(userId, currentWeek, dayOfWeek) as Record<string, unknown>[];
    }

    if (!path || path.length === 0) {
      // Try any unfinished lesson for today's day_of_week
      path = db.prepare(
        `SELECT dl.*,
                ulp.completed as user_completed,
                ulp.score as user_score,
                ulp.xp_earned as user_xp_earned,
                ulp.completed_at
         FROM daily_lessons dl
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
         WHERE (dl.company_id = ? OR dl.company_id IS NULL)
               AND dl.day_of_week = ? AND dl.active = 1
               AND (ulp.completed IS NULL OR ulp.completed = 0)
         ORDER BY dl.week_number ASC, dl.order_index ASC
         LIMIT 4`
      ).all(userId, companyId, dayOfWeek) as Record<string, unknown>[];
    }

    if (!path || path.length === 0) {
      // Final fallback: any unfinished lesson regardless of day (weekends, holidays, etc.)
      path = db.prepare(
        `SELECT dl.*,
                ulp.completed as user_completed,
                ulp.score as user_score,
                ulp.xp_earned as user_xp_earned,
                ulp.completed_at
         FROM daily_lessons dl
         LEFT JOIN user_lesson_progress ulp ON ulp.lesson_id = dl.id AND ulp.user_id = ?
         WHERE (dl.company_id = ? OR dl.company_id IS NULL)
               AND dl.active = 1
               AND (ulp.completed IS NULL OR ulp.completed = 0)
         ORDER BY dl.week_number ASC, dl.day_of_week ASC, dl.order_index ASC
         LIMIT 4`
      ).all(userId, companyId) as Record<string, unknown>[];
    }

    const normalizedPath = (path || []).map((row) => ({
      ...row,
      user_completed: !!row.user_completed,
      content_json: normalizeLessonContent(row.type, row.content_json, row.title),
    }));
    const nextLesson = normalizedPath.find((l) => !l.user_completed) || null;
    const pathCompleted = normalizedPath.filter((l) => l.user_completed).length;
    const pathTotal = normalizedPath.length;

    // Get gamification config for hearts info
    const config = db.prepare(
      'SELECT hearts_enabled, xp_lesson FROM gamification_config WHERE company_id = ?'
    ).get(companyId) as { hearts_enabled: number; xp_lesson: number } | undefined;

    // Get hearts if enabled
    let hearts = null;
    if (config?.hearts_enabled) {
      hearts = db.prepare('SELECT hearts, max_hearts FROM user_hearts WHERE user_id = ?').get(userId) as { hearts: number; max_hearts: number } | undefined;
    }

    // Get today's completion count
    const todayCompleted = (db.prepare(
      `SELECT COUNT(*) as count FROM user_lesson_progress
       WHERE user_id = ? AND completed = 1 AND DATE(completed_at) = ?`
    ).get(userId, today) as { count: number }).count;

    return NextResponse.json({
      lesson: nextLesson,
      path: normalizedPath,
      pathProgress: {
        completed: pathCompleted,
        total: pathTotal,
        remaining: Math.max(0, pathTotal - pathCompleted),
      },
      progress: {
        totalCompleted: completedCount,
        currentWeek,
        todayCompleted,
      },
      hearts: hearts ? { current: hearts.hearts, max: hearts.max_hearts } : null,
      heartsEnabled: !!config?.hearts_enabled,
      xpReward: config?.xp_lesson ?? 20,
    });
  } catch (error) {
    return handleApiError(error);
  }
});

const completeLessonSchema = z.object({
  lessonId: z.string().min(1, 'lessonId obrigatorio'),
  score: z.number().min(0).max(100).optional().default(100),
  wrongAnswers: z.number().min(0).optional().default(0),
});

// POST /api/gamification/daily-lesson - Mark lesson as completed
export const POST = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const body = await req.json();
    const parsed = completeLessonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { lessonId, score, wrongAnswers } = parsed.data;
    const userId = auth.userId;
    const companyId = auth.companyId;
    const db = getReadDb();

    // Verify lesson exists
    const lesson = db.prepare(
      'SELECT * FROM daily_lessons WHERE id = ? AND active = 1'
    ).get(lessonId) as { id: string; company_id: string | null; xp_reward: number } | undefined;

    if (!lesson) {
      return NextResponse.json({ error: 'Licao nao encontrada' }, { status: 404 });
    }

    // Check company isolation
    if (lesson.company_id && lesson.company_id !== companyId) {
      return NextResponse.json({ error: 'Permissao insuficiente' }, { status: 403 });
    }

    // Check if already completed
    const existing = db.prepare(
      'SELECT * FROM user_lesson_progress WHERE user_id = ? AND lesson_id = ?'
    ).get(userId, lessonId) as { completed: number } | undefined;

    if (existing?.completed) {
      return NextResponse.json({ error: 'Licao ja completada', alreadyCompleted: true }, { status: 409 });
    }

    // Check hearts (if enabled and wrong answers)
    const config = db.prepare(
      'SELECT * FROM gamification_config WHERE company_id = ?'
    ).get(companyId) as { hearts_enabled: number; xp_lesson: number; hearts_refill_hours: number } | undefined;

    if (config?.hearts_enabled && wrongAnswers > 0) {
      const userHearts = db.prepare('SELECT * FROM user_hearts WHERE user_id = ?').get(userId) as { hearts: number } | undefined;
      if (userHearts && userHearts.hearts <= 0) {
        return NextResponse.json({ error: 'Sem vidas disponiveis. Aguarde a recarga.', noHearts: true }, { status: 422 });
      }

      // Deduct hearts for wrong answers
      const writeQueue = getWriteQueue();
      await writeQueue.enqueue((wdb) => {
        const deduction = Math.min(wrongAnswers, userHearts?.hearts ?? 5);
        wdb.prepare('UPDATE user_hearts SET hearts = MAX(0, hearts - ?) WHERE user_id = ?').run(deduction, userId);
      });
    }

    // Record completion
    const xpReward = config?.xp_lesson ?? lesson.xp_reward;
    const writeQueue = getWriteQueue();
    await writeQueue.enqueue((wdb) => {
      if (existing) {
        wdb.prepare(
          `UPDATE user_lesson_progress SET completed = 1, score = ?, xp_earned = ?, completed_at = datetime('now') WHERE user_id = ? AND lesson_id = ?`
        ).run(score, xpReward, userId, lessonId);
      } else {
        wdb.prepare(
          `INSERT INTO user_lesson_progress (id, user_id, lesson_id, completed, score, xp_earned, completed_at)
           VALUES (?, ?, ?, 1, ?, ?, datetime('now'))`
        ).run(nanoid(), userId, lessonId, score, xpReward);
      }
    });

    // Award XP
    const result = await addPoints(userId, xpReward, 'lesson', lessonId);

    return NextResponse.json({
      success: true,
      xpEarned: xpReward,
      newPoints: result.newPoints,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      score,
    });
  } catch (error) {
    return handleApiError(error);
  }
});
