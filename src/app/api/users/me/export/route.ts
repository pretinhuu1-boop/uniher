import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/errors';
import { getWriteQueue, openReadOnlyDb } from '@/lib/db';
import { initDb } from '@/lib/db/init';
import {
  createDsarExportJsonChunks,
  finishDsarExportReservation,
  reserveDsarExportWindow,
  type DsarExportOutcome,
} from '@/lib/privacy/dsar-export';

// GET /api/users/me/export - exportar todos os dados da usuária (LGPD)
export const GET = withAuth(async (req, { auth }) => {
  try {
    await initDb();
    const userId = auth.userId;
    const writeQueue = getWriteQueue();
    const reservation = await writeQueue.enqueue(
      (db) => reserveDsarExportWindow(db, userId),
      'reserve DSAR export window',
    );

    const exportedAt = new Date().toISOString();
    let readDb;
    try {
      readDb = openReadOnlyDb();
    } catch (error) {
      await writeQueue.enqueue(
        (db) => finishDsarExportReservation(db, userId, reservation.token, 'failed'),
        'fail DSAR export reservation',
      );
      throw error;
    }
    const iterator = createDsarExportJsonChunks(readDb, userId, exportedAt);
    const encoder = new TextEncoder();
    let resourcesClosed = false;
    let aborted = false;
    let abortHandler: (() => void) | null = null;
    let cleanupPromise: Promise<void> | null = null;

    const closeResources = () => {
      if (resourcesClosed) return;
      resourcesClosed = true;
      if (abortHandler) {
        req.signal.removeEventListener('abort', abortHandler);
        abortHandler = null;
      }
      try {
        iterator.return(undefined);
      } finally {
        readDb.close();
      }
    };
    const cleanup = (outcome: DsarExportOutcome): Promise<void> => {
      if (cleanupPromise) return cleanupPromise;
      closeResources();
      cleanupPromise = writeQueue.enqueue(
        (db) => finishDsarExportReservation(db, userId, reservation.token, outcome),
        `finish DSAR export reservation: ${outcome}`,
      ).then(() => undefined);
      return cleanupPromise;
    };

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (aborted) {
          try { await cleanup('cancelled'); } catch { /* cooldown remains reserved */ }
          controller.error(new DOMException('The request was aborted.', 'AbortError'));
          return;
        }
        try {
          const result = iterator.next();
          if (result.done) {
            await cleanup('completed');
            controller.close();
            return;
          }
          controller.enqueue(encoder.encode(result.value));
        } catch (error) {
          let streamError = error;
          try {
            await cleanup('failed');
          } catch (cleanupError) {
            streamError = cleanupError;
          }
          controller.error(streamError);
        }
      },
      async cancel() {
        await cleanup('cancelled');
      },
    });

    abortHandler = () => {
      aborted = true;
      void cleanup('cancelled').catch(() => undefined);
    };
    if (req.signal.aborted) {
      abortHandler();
    } else {
      req.signal.addEventListener('abort', abortHandler, { once: true });
    }

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
