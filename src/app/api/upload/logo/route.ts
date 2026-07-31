import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/middleware';
import { removeUploadedFile, saveUploadedFile } from '@/lib/upload';
import { getWriteQueue } from '@/lib/db';
import { checkUploadRateLimit } from '@/lib/security/rate-limit';
import { handleApiError, RateLimitError } from '@/lib/errors';

function uploadErrorResponse(error: unknown): NextResponse {
  if (error instanceof RateLimitError) return handleApiError(error);

  const message = error instanceof Error ? error.message : '';
  if (
    message.includes('permitido')
    || message.includes('muito grande')
    || message.includes('corresponde')
    || message.includes('Limite de armazenamento')
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const retryable = message.includes('SQLITE_BUSY')
    || message.includes('SQLITE_LOCKED')
    || message.includes('database is locked');
  return NextResponse.json(
    {
      error: retryable
        ? 'Upload temporariamente indisponivel. Tente novamente.'
        : 'Erro ao fazer upload.',
    },
    { status: retryable ? 503 : 500 },
  );
}

export const POST = withRole('rh', 'admin')(async (req: NextRequest, context) => {
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

    const { url } = await saveUploadedFile(file, 'logos', context.auth.userId);
    let previousUrl: string | null;

    try {
      previousUrl = await getWriteQueue().enqueue((db) => {
        const previous = db
          .prepare('SELECT logo_url FROM companies WHERE id = ?')
          .get(context.auth.companyId) as { logo_url: string | null } | undefined;
        const result = db.prepare('UPDATE companies SET logo_url = ? WHERE id = ?').run(
          url,
          context.auth.companyId
        );

        if (result.changes !== 1) {
          throw new Error('Nao foi possivel atualizar o logo da empresa.');
        }

        return previous?.logo_url ?? null;
      }, 'replace logo upload pointer', { retryOnFailure: false });
    } catch (updateError) {
      try {
        await removeUploadedFile(url);
      } catch (cleanupError) {
        throw new AggregateError(
          [updateError, cleanupError],
          'Falha ao atualizar o logo e compensar o novo upload.',
        );
      }
      throw updateError;
    }

    if (previousUrl && previousUrl !== url) {
      try {
        await removeUploadedFile(previousUrl);
      } catch {
        console.error('[UPLOAD] Falha ao remover o logo anterior');
      }
    }

    return NextResponse.json({ success: true, url });
  } catch (err) {
    return uploadErrorResponse(err);
  }
});
