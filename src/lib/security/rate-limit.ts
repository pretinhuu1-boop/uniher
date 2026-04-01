import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitError } from '../errors';
import { getReadDb, getWriteQueue } from '@/lib/db';
import { nanoid } from 'nanoid';

// In production, Nginx/Cloudflare handles volumetric rate limiting.
// App-level limiting is a second defense — generous enough for dev/test, strict enough for direct exposure.
const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.PLAYWRIGHT_TEST === '1';

// Progressive lockout for auth (general — relaxed in test mode to allow setup flows)
const authLimiter1 = new RateLimiterMemory({ points: isTest ? 500 : isProd ? 5 : 10, duration: 60, keyPrefix: 'auth1' });
const authLimiter2 = new RateLimiterMemory({ points: isTest ? 1000 : isProd ? 10 : 20, duration: 300, keyPrefix: 'auth2' });
const authLimiter3 = new RateLimiterMemory({ points: isTest ? 2000 : isProd ? 20 : 40, duration: 1800, keyPrefix: 'auth3' });

// Brute-force detector: counts FAILED login attempts only.
// NOT relaxed by PLAYWRIGHT_TEST — brute force protection must always be active.
//
// Key: `ip:email` — each email address has its own per-IP quota.
// This prevents parallel test workers (all using 127.0.0.1) from consuming
// each other's budgets when they test different email addresses.
// Email-enumeration is prevented at the application layer: both existing and
// non-existing emails go through the same flow and produce the same response
// until their individual bucket is exhausted — at which point BOTH return 429.
//
// Prod limit: 5 failed attempts/min (strict)
// Dev limit : 15 failed attempts/min (accommodates E2E brute-force tests that
//             send up to 15 requests with a dedicated brute-force email)
const bruteForceBlocker = new RateLimiterMemory({ points: isProd ? 5 : 15, duration: 60, keyPrefix: 'bf1' });

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

/**
 * Record a failed authentication attempt.
 * Enforces brute-force limit even in PLAYWRIGHT_TEST mode.
 * Call this after verifying credentials failed (wrong password, user not found, etc.).
 *
 * Key is `ip:email` so parallel test workers (all using 127.0.0.1) with
 * different email addresses don't share each other's rate-limit quota.
 * Falls back to ip-only when email is not provided.
 */
export async function recordFailedAuth(req: Request, email?: string): Promise<void> {
  const ip = getClientIp(req);
  const key = email ? `${ip}:${email}` : ip;
  try {
    await bruteForceBlocker.consume(key);
  } catch {
    throw new RateLimitError('Muitas tentativas de login. Aguarde 1 minuto.');
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
