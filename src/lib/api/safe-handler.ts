import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type RouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

function logError(error: unknown, method: string, url: string) {
  try {
    const logPath = path.join(process.cwd(), 'data', 'errors.log');
    const timestamp = new Date().toISOString();
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    const entry = `[${timestamp}] ${method} ${url}\n  Error: ${message}\n  ${stack}\n\n`;
    fs.appendFileSync(logPath, entry);
  } catch {
    // Ignore file write errors
  }
}

/**
 * Wraps an API route handler with automatic error catching.
 * Prevents unhandled errors from crashing the process.
 */
export function safeHandler(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      const url = req.nextUrl?.pathname || req.url || 'unknown';
      const method = req.method || 'UNKNOWN';

      logError(error, method, url);
      console.error(`[API Error] ${method} ${url}:`, error);

      // Return safe error response
      const message = error instanceof Error ? error.message : 'Internal server error';
      const status = (error as any)?.statusCode || 500;

      return NextResponse.json(
        { error: status >= 500 ? 'Erro interno do servidor' : message, code: 'INTERNAL_ERROR' },
        { status }
      );
    }
  };
}
