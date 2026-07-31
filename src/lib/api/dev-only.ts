import { NextRequest, NextResponse } from 'next/server';
import { getReadDb } from '@/lib/db';
import { hasActiveMasterAdminActor } from '@/lib/security/active-rh-actor';

function isLoopback(value: string): boolean {
  const normalized = value.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === 'localhost' || normalized === '::1') return true;

  const ipv4 = normalized.match(/^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) return ipv4.slice(1).every((part) => Number(part) <= 255);

  const mappedIpv4 = normalized.match(/^::ffff:127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return Boolean(mappedIpv4?.slice(1).every((part) => Number(part) <= 255));
}

function hasTrustedLoopbackOrigin(req: NextRequest): boolean {
  if (!isLoopback(req.nextUrl.hostname)) return false;

  const origin = req.headers.get('origin');
  if (!origin) return false;

  try {
    const parsedOrigin = new URL(origin);
    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol)
      || parsedOrigin.username
      || parsedOrigin.password
      || !isLoopback(parsedOrigin.hostname)
      || parsedOrigin.protocol !== req.nextUrl.protocol
      || parsedOrigin.port !== req.nextUrl.port
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const forwardedAddresses = [
    req.headers.get('x-real-ip'),
    req.headers.get('x-forwarded-for'),
  ]
    .filter((value): value is string => value !== null)
    .flatMap((value) => value.split(','));

  return forwardedAddresses.length > 0 && forwardedAddresses.every(isLoopback);
}

function forbidden(): NextResponse {
  return NextResponse.json(
    { error: 'Endpoint disponivel apenas no ambiente local' },
    { status: 403 },
  );
}

/**
 * Guard: rejects production and non-loopback requests.
 * System management endpoints must only work on localhost/development.
 */
export function devOnlyGuard(req?: NextRequest): NextResponse | null {
  if (
    process.env.NODE_ENV === 'production'
    || !req
    || !hasTrustedLoopbackOrigin(req)
  ) {
    return forbidden();
  }
  return null;
}

export function activeMasterAdminEffectGuard(actorId: string): NextResponse | null {
  try {
    if (hasActiveMasterAdminActor(getReadDb(), actorId)) return null;
  } catch {
    // Operational effects fail closed if actor state cannot be read.
  }

  return forbidden();
}
