import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { saveUploadedFile } from '@/lib/upload';
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

    const { url } = await saveUploadedFile(file, 'avatars');

    await getWriteQueue().enqueue((db) => {
      db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(
        url,
        context.auth.userId
      );
    });

    return NextResponse.json({ success: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao fazer upload';
    const status = message.includes('não permitido') || message.includes('muito grande') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
