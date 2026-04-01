import { NextResponse } from 'next/server';
import { logger, generateRequestId } from '@/lib/logger';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permissão insuficiente') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Muitas requisições. Tente novamente mais tarde.') {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

/** Transforma qualquer erro em uma resposta HTTP padronizada */
export function handleApiError(error: unknown, reqId?: string): NextResponse {
  const requestId = reqId || generateRequestId();

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ requestId, code: error.code, status: error.statusCode }, error.message);
    }
    return NextResponse.json(
      {
        status: error.statusCode,
        code: error.code || 'APP_ERROR',
        error: error.message,   // backward-compat alias (tests use body.error)
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId,
      },
      { status: error.statusCode }
    );
  }

  const msg = error instanceof Error ? error.message : 'Unknown error';
  logger.error({ requestId, err: error }, `Unhandled: ${msg}`);

  return NextResponse.json(
    {
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
      requestId,
    },
    { status: 500 }
  );
}
