import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { getWriteQueue } from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Magic byte requirements for validating file content matches declared MIME type
const MAGIC_BYTES: Record<string, Array<{ offset: number; bytes: number[] }>> = {
  'image/jpeg': [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const requirements = MAGIC_BYTES[mimeType];
  if (!requirements || requirements.length === 0) return true;

  return requirements.every(({ offset, bytes }) =>
    bytes.every((byte, index) => buffer[offset + index] === byte)
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
const MANAGED_UPLOAD_URL = /^\/uploads\/(avatars|logos|general)\/([a-zA-Z0-9_-]{12}\.(?:jpe?g|png|webp))$/;

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

async function releaseUploadByPath(uploadUrl: string): Promise<void> {
  await getWriteQueue().enqueue((db) => {
    db.prepare('DELETE FROM user_uploads WHERE file_path = ?').run(uploadUrl);
  }, 'release uploaded file quota');
}

function resolveManagedUploadPath(uploadUrl: string): string | null {
  const match = MANAGED_UPLOAD_URL.exec(uploadUrl);
  if (!match) return null;

  const uploadRoot = path.resolve(process.cwd(), 'public', 'uploads');
  const filePath = path.resolve(uploadRoot, match[1], match[2]);
  const relativePath = path.relative(uploadRoot, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return filePath;
}

export async function removeUploadedFile(uploadUrl: string): Promise<boolean> {
  const filePath = resolveManagedUploadPath(uploadUrl);
  if (!filePath) return false;

  let fileError: unknown;
  let quotaError: unknown;

  try {
    fs.rmSync(filePath, { force: true });
  } catch (error) {
    fileError = error;
  }

  try {
    await releaseUploadByPath(uploadUrl);
  } catch (error) {
    quotaError = error;
  }

  if (fileError && quotaError) {
    throw new AggregateError(
      [fileError, quotaError],
      'Falha ao remover o arquivo e liberar sua cota.',
    );
  }
  if (fileError) throw fileError;
  if (quotaError) throw quotaError;

  return true;
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
