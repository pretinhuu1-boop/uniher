import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { getReadDb, getWriteQueue } from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/webp') {
    return buffer.length >= 12
      && buffer[0] === 0x52
      && buffer[1] === 0x49
      && buffer[2] === 0x46
      && buffer[3] === 0x46
      && buffer[8] === 0x57
      && buffer[9] === 0x45
      && buffer[10] === 0x42
      && buffer[11] === 0x50;
  }

  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures || signatures.length === 0) return true;

  return signatures.some((sig) =>
    sig.every((byte, i) => buffer.length > i && buffer[i] === byte)
  );
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
}

const MAX_USER_STORAGE = 50 * 1024 * 1024; // 50MB per user

function getUserStorageUsed(userId: string): number {
  const db = getReadDb();
  const row = db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM user_uploads WHERE user_id = ?').get(userId) as { total: number };
  return row.total;
}

function trackUpload(userId: string, filePath: string, fileSize: number, category: string): void {
  const writeQueue = getWriteQueue();
  writeQueue.enqueue((db) => {
    db.prepare('INSERT INTO user_uploads (id, user_id, file_path, file_size, category) VALUES (?, ?, ?, ?, ?)').run(
      nanoid(), userId, filePath, fileSize, category
    );
  });
}

export async function saveUploadedFile(
  file: File,
  category: 'avatars' | 'logos' | 'general',
  userId?: string
): Promise<{ url: string; filename: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo de arquivo nao permitido. Use: JPG, PNG ou WebP.');
  }

  if (file.size > MAX_SIZE) {
    throw new Error('Arquivo muito grande. Maximo: 5MB.');
  }

  const safeName = sanitizeFilename(file.name);
  const rawExt = safeName.split('.').pop()?.toLowerCase() || '';
  const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg';

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!validateMagicBytes(buffer, file.type)) {
    throw new Error('Conteudo do arquivo nao corresponde ao tipo declarado.');
  }

  if (userId) {
    const currentUsage = getUserStorageUsed(userId);
    if (currentUsage + file.size > MAX_USER_STORAGE) {
      throw new Error('Limite de armazenamento excedido (50MB). Remova arquivos antigos antes de enviar novos.');
    }
  }

  const filename = `${nanoid(12)}.${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', category);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  const url = `/uploads/${category}/${filename}`;

  if (userId) {
    trackUpload(userId, url, file.size, category);
  }

  return { url, filename };
}
