import { RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitError } from '../errors';

// Rate limiter para auth (login, register): 5 tentativas por minuto por IP
const authLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
  keyPrefix: 'auth',
});

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

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return '127.0.0.1';
}

export async function checkAuthRateLimit(req: Request): Promise<void> {
  const ip = getClientIp(req);
  try {
    await authLimiter.consume(ip);
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
