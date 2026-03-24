import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { getReadDb, getWriteQueue } from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Magic bytes signatures for validating file content matches declared MIME type
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
  'image/svg+xml': [], // SVG is text-based, validated separately
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  // SVG is XML text — check for opening tag
  if (mimeType === 'image/svg+xml') {
    const head = buffer.subarray(0, 256).toString('utf-8').trimStart().toLowerCase();
    return head.startsWith('<?xml') || head.startsWith('<svg');
  }

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
  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Tipo de arquivo não permitido. Use: JPG, PNG, WebP ou SVG.');
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

  // Per-user storage limit check
  if (userId) {
    const currentUsage = getUserStorageUsed(userId);
    if (currentUsage + file.size > MAX_USER_STORAGE) {
      throw new Error('Limite de armazenamento excedido (50MB). Remova arquivos antigos antes de enviar novos.');
    }
  }

  // Generate unique filename
  const filename = `${nanoid(12)}.${ext}`;

  // Ensure directory exists
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', category);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Write file
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  const url = `/uploads/${category}/${filename}`;

  // Track upload in DB for storage accounting
  if (userId) {
    trackUpload(userId, url, file.size, category);
  }

  return { url, filename };
}
