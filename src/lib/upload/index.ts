import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { getWriteQueue } from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes signatures for validating file content matches declared MIME type
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures || signatures.length === 0) return true;

  return signatures.some((sig) =>
    sig.every((byte, i) => buffer.length > i && buffer[i] === byte)
  );
}

/** Sanitize filename: remove path traversal characters and non-safe chars */
function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

const MAX_USER_STORAGE = 50 * 1024 * 1024; // 50MB per user

const STORAGE_LIMIT_ERROR = 'Limite de armazenamento excedido (50MB). Remova arquivos antigos antes de enviar novos.';

async function reserveUploadQuota(
  userId: string,
  filePath: string,
  fileSize: number,
  category: string,
): Promise<string> {
  const reservationId = nanoid();
  const writeQueue = getWriteQueue();

  await writeQueue.enqueue((db) => {
    const reserve = db.transaction(() => {
      const row = db
        .prepare('SELECT COALESCE(SUM(file_size), 0) AS total FROM user_uploads WHERE user_id = ?')
        .get(userId) as { total: number };

      if (row.total + fileSize > MAX_USER_STORAGE) {
        throw new Error(STORAGE_LIMIT_ERROR);
      }

      db.prepare(`
        INSERT INTO user_uploads (id, user_id, file_path, file_size, category)
        VALUES (?, ?, ?, ?, ?)
      `).run(reservationId, userId, filePath, fileSize, category);
    });

    try {
      reserve.immediate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('SQLITE_BUSY')
        || message.includes('SQLITE_LOCKED')
        || message.includes('database is locked')
      ) {
        // Do not let the queue retry later and create an orphan reservation.
        throw new Error('Nao foi possivel reservar a cota de upload. Tente novamente.');
      }
      throw error;
    }
  }, 'reserve upload quota');

  return reservationId;
}

async function releaseUploadReservation(reservationId: string): Promise<void> {
  await getWriteQueue().enqueue((db) => {
    db.prepare('DELETE FROM user_uploads WHERE id = ?').run(reservationId);
  }, 'release upload quota reservation');
}

export async function saveUploadedFile(
  file: File,
  category: 'avatars' | 'logos' | 'general',
  userId?: string
): Promise<{ url: string; filename: string }> {
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG ou WebP.');
  }
  // Validate size
  if (file.size > MAX_SIZE) {
    throw new Error('Arquivo muito grande. Máximo: 5MB.');
  }

  // Sanitize original filename and extract extension
  const safeName = sanitizeFilename(file.name);
  const rawExt = safeName.split('.').pop()?.toLowerCase() || '';

  // Whitelist the extension — fallback to 'jpg' if not allowed
  const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg';

  // Read file buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate magic bytes match declared MIME type
  if (!validateMagicBytes(buffer, file.type)) {
    throw new Error('Conteúdo do arquivo não corresponde ao tipo declarado.');
  }

  // Generate unique filename
  const filename = `${nanoid(12)}.${ext}`;
  const url = `/uploads/${category}/${filename}`;
  const reservationId = userId
    ? await reserveUploadQuota(userId, url, file.size, category)
    : null;

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', category);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadDir, filename), buffer);
  } catch (writeError) {
    if (reservationId) {
      try {
        await releaseUploadReservation(reservationId);
      } catch (cleanupError) {
        throw new AggregateError(
          [writeError, cleanupError],
          'Falha ao salvar o arquivo e liberar a reserva de cota.',
        );
      }
    }
    throw writeError;
  }

  return { url, filename };
}
