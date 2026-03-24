import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitError } from '../errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

// In production, Nginx/Cloudflare handles volumetric rate limiting.
// App-level limiting is a second defense — generous enough for dev/test, strict enough for direct exposure.
const isProd = process.env.NODE_ENV === 'production';

// Progressive lockout for auth
const authLimiter1 = new RateLimiterMemory({ points: isProd ? 5 : 50, duration: 60, keyPrefix: 'auth1' });
const authLimiter2 = new RateLimiterMemory({ points: isProd ? 10 : 100, duration: 300, keyPrefix: 'auth2' });
const authLimiter3 = new RateLimiterMemory({ points: isProd ? 20 : 200, duration: 1800, keyPrefix: 'auth3' });

// Rate limiter geral para escrita: 30 req/min por IP
const writeLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
  keyPrefix: 'write',
});

// Rate limiter para leitura: 100 req/min por IP
const readLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
  keyPrefix: 'read',
});

// Rate limiter para admin (write operations): 30 req/min por IP
const adminLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
  keyPrefix: 'admin',
});

// Rate limiter para uploads: 10 uploads/min por IP
const uploadLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
  keyPrefix: 'upload',
});

// Rate limiter para forgot-password: 3 tentativas/hora por chave (IP ou email)
const forgotPasswordLimiter = new RateLimiterMemory({
  points: 3,
  duration: 3600,
  keyPrefix: 'forgot-password',
});

// Rate limiter para rotas públicas (health, vapid-key): 30 req/min por IP
const publicLimiter = new RateLimiterMemory({
  points: 30,
  duration: 60,
  keyPrefix: 'public',
});

// Rate limiter global por IP: 200 req/min (proteção DDoS básica)
const globalLimiter = new RateLimiterMemory({
  points: 200,
  duration: 60,
  keyPrefix: 'global',
});

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return '127.0.0.1';
}

export async function checkAuthRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);

  // Tier 3: 30-minute block (most severe)
  try {
    await authLimiter3.consume(ip);
  } catch {
    // Alert admins about sustained brute force
    try {
      const db = getReadDb();
      const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL").all() as { id: string }[];
      const writeQueue = getWriteQueue();
      writeQueue.enqueue((wdb) => {
        const stmt = wdb.prepare('INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, ?, ?, ?)');
        admins.forEach(a => stmt.run(nanoid(), a.id, 'security', 'Alerta de Segurança', `Múltiplas tentativas de login bloqueadas do IP ${ip}`));
      });
    } catch { /* best-effort notification */ }
    throw new RateLimitError('Conta temporariamente bloqueada. Aguarde 30 minutos.');
  }

  // Tier 2: 5-minute cooldown
  try {
    await authLimiter2.consume(ip);
  } catch {
    throw new RateLimitError('Muitas tentativas. Aguarde 5 minutos.');
  }

  // Tier 1: 1-minute cooldown
  try {
    await authLimiter1.consume(ip);
  } catch {
    throw new RateLimitError('Muitas tentativas. Aguarde 1 minuto.');
  }
}

export async function checkWriteRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);
  try {
    await writeLimiter.consume(ip);
  } catch {
    throw new RateLimitError();
  }
}

export async function checkReadRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);
  try {
    await readLimiter.consume(ip);
  } catch {
    throw new RateLimitError();
  }
}

export async function checkAdminRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);
  try {
    await adminLimiter.consume(ip);
  } catch {
    throw new RateLimitError('Muitas requisições administrativas. Aguarde 1 minuto.');
  }
}

export async function checkUploadRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);
  try {
    await uploadLimiter.consume(ip);
  } catch {
    throw new RateLimitError('Muitos uploads. Aguarde 1 minuto.');
  }
}

export async function checkPublicRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);
  try {
    await publicLimiter.consume(ip);
  } catch {
    throw new RateLimitError('Muitas requisições. Aguarde 1 minuto.');
  }
}

export async function checkGlobalRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);
  try {
    await globalLimiter.consume(ip);
  } catch {
    throw new RateLimitError('Limite de requisições excedido. Aguarde 1 minuto.');
  }
}

export async function checkForgotPasswordRateLimit(req: Request, email: string): Promise<void> {
  const ip = getClientIp(req);
  try {
    await forgotPasswordLimiter.consume(`ip:${ip}`);
  } catch {
    throw new RateLimitError('Muitas tentativas de recuperação de senha. Tente novamente em 1 hora.');
  }
  try {
    await forgotPasswordLimiter.consume(`email:${email}`);
  } catch {
    throw new RateLimitError('Muitas tentativas de recuperação de senha para este email. Tente novamente em 1 hora.');
  }
}
