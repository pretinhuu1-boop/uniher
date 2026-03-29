import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev ? { target: 'pino/file', options: { destination: 1 } } : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['password', 'password_hash', 'token', 'accessToken', 'refreshToken', 'secret', '*.password', '*.password_hash'],
    censor: '[REDACTED]',
  },
});

/** Create a child logger with requestId for request tracing */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

/** Generate a unique request ID */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
