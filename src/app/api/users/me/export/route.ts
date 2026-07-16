import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import { createDsarExportJsonChunks, reserveDsarExportWindow } from '@/lib/privacy/dsar-export';

// GET /api/users/me/export - exportar todos os dados da usuária (LGPD)
export const GET = withAuth(async (_req, { auth }) => {
  try {
    await initDb();
    const userId = auth.userId;
    await getWriteQueue().enqueue(
      (db) => reserveDsarExportWindow(db, userId),
      'reserve DSAR export window',
    );

    const exportedAt = new Date().toISOString();
    const iterator = createDsarExportJsonChunks(getReadDb(), userId, exportedAt);
    const encoder = new TextEncoder();
    let iteratorClosed = false;
    const closeIterator = () => {
      if (iteratorClosed) return;
      iteratorClosed = true;
      iterator.return(undefined);
    };
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        try {
          const result = iterator.next();
          if (result.done) {
            iteratorClosed = true;
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(result.value));
        } catch (error) {
          try { closeIterator(); } catch { /* preserve the stream error */ }
          controller.error(error);
        }
      },
      cancel() {
        closeIterator();
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="uniher-dados-${exportedAt.slice(0, 10)}.json"`,
        'Cache-Control': 'private, no-store',
        'Vary': 'Cookie',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
});
