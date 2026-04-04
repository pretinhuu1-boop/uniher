import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { checkUploadRateLimit } from '@/lib/security/rate-limit';
import { saveUploadedFile } from '@/lib/upload';

export const POST = withAuth(async (req: NextRequest, context) => {
  try {
    await checkUploadRateLimit(req);

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    const result = await saveUploadedFile(file, 'general', context.auth.userId);

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao fazer upload';
    const status = message.includes('nÃ£o permitido')
      || message.includes('não permitido')
      || message.includes('muito grande')
      || message.includes('nÃ£o corresponde')
      || message.includes('não corresponde')
      || message.includes('armazenamento')
      || message.includes('Nenhum arquivo')
      ? 400
      : 400;

    return NextResponse.json({ error: message }, { status });
  }
});
