import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

/** POST — Save push subscription for current user */
export const POST = withAuth(async (req: NextRequest, { auth }) => {
  try {
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Dados de inscrição inválidos' },
        { status: 400 }
      );
    }

    const id = nanoid();
    await getWriteQueue().enqueue((db) => {
      db.prepare(`
        INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id, endpoint) DO UPDATE SET
          p256dh = excluded.p256dh,
          auth = excluded.auth
      `).run(id, auth.userId, endpoint, keys.p256dh, keys.auth);
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[PUSH SUBSCRIBE]', err.message);
    return NextResponse.json(
      { error: 'Erro ao salvar inscrição push' },
      { status: 500 }
    );
  }
});

/** DELETE — Remove push subscription for current user */
export const DELETE = withAuth(async (req: NextRequest, { auth }) => {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint não fornecido' },
        { status: 400 }
      );
    }

    await getWriteQueue().enqueue((db) => {
      db.prepare(
        'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
      ).run(auth.userId, endpoint);
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[PUSH UNSUBSCRIBE]', err.message);
    return NextResponse.json(
      { error: 'Erro ao remover inscrição push' },
      { status: 500 }
    );
  }
});
