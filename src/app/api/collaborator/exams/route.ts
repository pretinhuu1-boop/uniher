/**
 * GET /api/collaborator/exams — lista exames do usuário
 * POST /api/collaborator/exams — registra exame realizado
 */
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';
import { initDb } from '@/lib/db/init';

export const GET = withAuth(async (_req: NextRequest, context: any) => {
  await initDb();
  const db = getReadDb();
  const userId = context.auth.userId;

  const exams = db.prepare(`
    SELECT id, exam_name, status, due_date, completed_date, created_at
    FROM user_exams
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId);

  return NextResponse.json({ exams });
});

export const POST = withAuth(async (req: NextRequest, context: any) => {
  await initDb();
  const userId = context.auth.userId;
  const body = await req.json();

  const { exam_name, completed_date, due_date } = body;

  if (!exam_name) {
    return NextResponse.json({ error: 'Nome do exame é obrigatório' }, { status: 400 });
  }

  const validExams = ['Mamografia', 'Papanicolau', 'Hemograma', 'Glicemia', 'Colesterol', 'Tireoide', 'Vitamina D', 'Outro'];
  if (!validExams.includes(exam_name)) {
    return NextResponse.json({ error: 'Tipo de exame inválido' }, { status: 400 });
  }

  const writeQueue = getWriteQueue();
  const id = nanoid();
  const status = completed_date ? 'completed' : (due_date ? 'scheduled' : 'pending');

  await writeQueue.enqueue((db) => {
    db.prepare(`
      INSERT INTO user_exams (id, user_id, exam_name, status, completed_date, due_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, exam_name, status, completed_date || null, due_date || null);
  });

  // Recalculate semaforo after exam registration
  try {
    const { recalculateSemaforo } = await import('@/services/semaforo-calculator.service');
    await recalculateSemaforo(userId);
  } catch { /* non-critical */ }

  return NextResponse.json({ id, exam_name, status, completed_date });
});
