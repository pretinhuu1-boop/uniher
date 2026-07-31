import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { removeUploadedFile, saveUploadedFile } from '@/lib/upload';
import { getWriteQueue } from '@/lib/db';
import { checkUploadRateLimit } from '@/lib/security/rate-limit';

export const POST = withAuth(async (req: NextRequest, context) => {
  try {
    await checkUploadRateLimit(req);
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    const { url } = await saveUploadedFile(file, 'avatars', context.auth.userId);
    let previousUrl: string | null;

    try {
      previousUrl = await getWriteQueue().enqueue((db) => {
        const previous = db
          .prepare('SELECT avatar_url FROM users WHERE id = ?')
          .get(context.auth.userId) as { avatar_url: string | null } | undefined;
        const result = db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(
          url,
          context.auth.userId
        );

        if (result.changes !== 1) {
          throw new Error('Nao foi possivel atualizar o avatar do usuario.');
        }

        return previous?.avatar_url ?? null;
      });
    } catch (updateError) {
      try {
        await removeUploadedFile(url);
      } catch (cleanupError) {
        throw new AggregateError(
          [updateError, cleanupError],
          'Falha ao atualizar o avatar e compensar o novo upload.',
        );
      }
      throw updateError;
    }

    if (previousUrl && previousUrl !== url) {
      await removeUploadedFile(previousUrl);
    }

    return NextResponse.json({ success: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao fazer upload';
    const status = message.includes('não permitido') || message.includes('muito grande') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
